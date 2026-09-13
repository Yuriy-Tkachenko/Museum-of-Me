import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { availableInvite, HttpError, limitedBody, rateLimit, requireSameOrigin, securityError, verifyTurnstile, visitorIdentity } from "@/lib/security";
import { isPexelsImage, normalizeUpload } from "@/lib/media";

const exhibitSchema = z.object({
  title: z.string().trim().min(1).max(120), caption: z.string().trim().min(1).max(300),
  imageSource: z.enum(["pexels", "upload", "none"]),
  imageUrl: z.string().max(2048).default(""), imageSourceId: z.string().max(120).default(""), imageAuthor: z.string().max(160).default(""),
  submissionId: z.string().uuid(), turnstileToken: z.string().min(1).max(2048),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  let uploadedPath: string | null = null;
  let committed = false;
  try {
    requireSameOrigin(request);
    const visitor = await visitorIdentity();
    await rateLimit("exhibits-global", "all", 300, 3600);
    await rateLimit("exhibits-visitor", visitor, 10, 3600);
    const { token } = await params;
    const invite = await availableInvite(token);
    await rateLimit("exhibits-invite", invite.id, 150, 3600);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data;")) throw new HttpError(415, "Expected a form.");
    const bytes = await limitedBody(request, 4 * 1024 * 1024 + 16384);
    let form: FormData;
    try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new HttpError(400, "Invalid form."); }
    const fields: Record<string, string> = {};
    const seen = new Set<string>();
    const allowedFields = new Set(["title", "caption", "imageSource", "imageUrl", "imageSourceId", "imageAuthor", "submissionId", "turnstileToken", "file"]);
    for (const [key, value] of form) {
      if (!allowedFields.has(key) || seen.has(key)) throw new HttpError(400, "Unexpected or duplicate form fields.");
      seen.add(key);
      if (key !== "file" && typeof value !== "string") throw new HttpError(400, "Invalid form field.");
      if (typeof value === "string") fields[key] = value;
    }
    const parsed = exhibitSchema.safeParse(fields);
    if (!parsed.success) throw new HttpError(400, "Check the fields and complete verification.");
    const input = parsed.data;
    const file = form.get("file");
    if (input.imageSource === "upload" ? !(file instanceof File) || !file.size || Boolean(input.imageUrl) : file !== null) throw new HttpError(400, "Image source does not match the file.");
    if (input.imageSource === "pexels" && (!isPexelsImage(input.imageUrl) || !/^\d{1,20}$/.test(input.imageSourceId))) throw new HttpError(400, "Choose a valid Pexels image.");
    if (input.imageSource === "none" && input.imageUrl) throw new HttpError(400, "Remove the image first.");
    await verifyTurnstile(input.turnstileToken);
    const supabase = createSupabaseAdminClient();
    const exhibitId = crypto.randomUUID();
    let image = input.imageSource === "pexels" ? input.imageUrl : null;
    if (file instanceof File) {
      const normalized = await normalizeUpload(file);
      uploadedPath = `exhibits/${invite.museum_id}/${exhibitId}/exhibit.webp`;
      const { error } = await supabase.storage.from("exhibits").upload(uploadedPath, normalized, { contentType: "image/webp", cacheControl: "300", upsert: false });
      if (error) throw new HttpError(503, "Could not upload this image.");
      image = uploadedPath;
    }
    const { data, error } = await supabase.rpc("submit_exhibit_secure", {
      p_token: token, p_visitor: visitor, p_submission: input.submissionId, p_exhibit: exhibitId,
      p_title: input.title, p_caption: input.caption, p_image: image, p_source: input.imageSource,
      p_source_id: input.imageSource === "pexels" ? input.imageSourceId : null, p_author: input.imageSource === "pexels" ? input.imageAuthor : null,
    });
    // Transport errors have an ambiguous commit outcome: keep private files for reconciliation.
    if (error) { uploadedPath = null; throw new HttpError(503, "Could not confirm the submission. Please try again."); }
    if (data?.duplicate) throw new HttpError(409, "You have already submitted to this invitation.");
    if (!data?.ok) throw new HttpError(404, "This invitation is not available.");
    committed = true;
    return NextResponse.json({ ok: true, unlocked: data.unlocked, analyticsId: data.analyticsId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
  finally {
    if (uploadedPath && !committed) {
      try { await createSupabaseAdminClient().storage.from("exhibits").remove([uploadedPath]); } catch { /* private orphan; reconcile operationally */ }
    }
  }
}
