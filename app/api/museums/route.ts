import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createMuseumSchema } from "@/lib/validation";
import { normalizeUpload } from "@/lib/media";
import { recordMuseumBirth } from "@/lib/admin-analytics";
import { HttpError, limitedBody, rateLimit, requireSameOrigin, securityError } from "@/lib/security";

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  let retainUpload = false;
  try {
    requireSameOrigin(request);
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new HttpError(401, "You must be signed in to create a museum.");
    await rateLimit("museums-global", "all", 200, 3600);
    await rateLimit("museums-user", user.id, 5, 3600);
    const contentType = request.headers.get("content-type") ?? "";
    let body: unknown;
    let portrait: File | null = null;
    if (contentType.startsWith("application/json")) {
      const bytes = await limitedBody(request, 8192);
      try { body = JSON.parse(bytes.toString("utf8")); } catch { throw new HttpError(400, "Invalid JSON."); }
    } else if (contentType.startsWith("multipart/form-data;")) {
      const bytes = await limitedBody(request, 4 * 1024 * 1024 + 16384);
      let form: FormData;
      try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType } }).formData(); }
      catch { throw new HttpError(400, "Invalid form."); }
      const fields: Record<string, string> = {};
      const seen = new Set<string>();
      const allowed = new Set(["name", "username", "title", "requiredExhibits", "portrait"]);
      for (const [key, value] of form) {
        if (!allowed.has(key) || seen.has(key)) throw new HttpError(400, "Unexpected or duplicate form fields.");
        seen.add(key);
        if (key === "portrait") {
          if (!(value instanceof File) || !value.size) throw new HttpError(400, "Choose a portrait photo.");
          portrait = value;
        } else {
          if (typeof value !== "string") throw new HttpError(400, "Invalid form field.");
          fields[key] = value;
        }
      }
      body = fields;
    } else throw new HttpError(415, "Expected JSON or a form.");
    const parsed = createMuseumSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid form.");
    const admin = createSupabaseAdminClient();
    if (portrait) {
      const normalized = await normalizeUpload(portrait, { maxEdge: 2400, quality: 90 });
      uploadedPath = `portraits/${user.id}/${crypto.randomUUID()}/portrait.webp`;
      const { error: uploadError } = await admin.storage.from("portraits").upload(uploadedPath, normalized, { contentType: "image/webp", cacheControl: "3600", upsert: false });
      if (uploadError) throw new HttpError(503, "Could not upload your portrait. Please try again.");
    }
    retainUpload = true;
    const { data, error: createError } = await admin.rpc("create_museum_secure", {
      p_owner: user.id, p_username: parsed.data.username, p_name: parsed.data.name, p_title: parsed.data.title, p_required: parsed.data.requiredExhibits,
      ...(uploadedPath ? { p_portrait: uploadedPath } : {}),
    });
    if (createError) {
      // A network failure has an ambiguous commit outcome; retain private files.
      retainUpload = !createError.code || !/^[0-9A-Z]{5}$/.test(createError.code);
      throw new HttpError(createError.code === "23505" ? 409 : 503, createError.code === "23505" ? "That username or museum already exists." : "Could not create your museum.");
    }
    retainUpload = true;
    if (data?.analyticsId) await recordMuseumBirth(data.analyticsId, user.id);
    return NextResponse.json({ redirectTo: "/dashboard", museum: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
  finally {
    if (uploadedPath && !retainUpload) {
      try { await createSupabaseAdminClient().storage.from("portraits").remove([uploadedPath]); } catch { /* private orphan; reconcile operationally */ }
    }
  }
}
