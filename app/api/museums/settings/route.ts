import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HttpError, limitedBody, rateLimit, requireSameOrigin, securityError } from "@/lib/security";
import { updateMuseumDetailsSchema } from "@/lib/validation";
import { normalizeUpload } from "@/lib/media";

export async function PATCH(request: Request) {
  let uploadedPath: string | null = null;
  let retainUpload = false;
  try {
    requireSameOrigin(request);
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new HttpError(401, "You must be signed in to edit your museum.");
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || aal.currentLevel !== "aal2") throw new HttpError(403, "Confirm your Authenticator code before continuing.");

    await rateLimit("museum-settings", user.id, 20, 3600);
    const contentType = request.headers.get("content-type") ?? "";
    let body: unknown;
    let portrait: File | null = null;
    let portraitAction: "keep" | "remove" | "replace" = "keep";
    if (contentType.startsWith("application/json")) {
      const bytes = await limitedBody(request, 8192);
      try { body = JSON.parse(bytes.toString("utf8")); }
      catch { throw new HttpError(400, "Invalid JSON."); }
    } else if (contentType.startsWith("multipart/form-data;")) {
      const bytes = await limitedBody(request, 4 * 1024 * 1024 + 16384);
      let form: FormData;
      try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType } }).formData(); }
      catch { throw new HttpError(400, "Invalid form."); }
      const fields: Record<string, string> = {};
      const seen = new Set<string>();
      const allowed = new Set(["name", "username", "title", "portrait", "portraitAction"]);
      for (const [key, value] of form) {
        if (!allowed.has(key) || seen.has(key)) throw new HttpError(400, "Unexpected or duplicate form fields.");
        seen.add(key);
        if (key === "portrait") {
          if (!(value instanceof File) || !value.size) throw new HttpError(400, "Choose a portrait photo.");
          portrait = value; portraitAction = "replace";
        } else {
          if (typeof value !== "string") throw new HttpError(400, "Invalid form field.");
          if (key === "portraitAction") {
            if (value !== "remove") throw new HttpError(400, "Invalid portrait action.");
            portraitAction = "remove";
          } else fields[key] = value;
        }
      }
      if (portrait && seen.has("portraitAction")) throw new HttpError(400, "Choose either a replacement portrait or removal.");
      body = fields;
    } else throw new HttpError(415, "Expected JSON or a form.");
    const parsed = updateMuseumDetailsSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid form.");

    const admin = createSupabaseAdminClient();
    const { data: museum, error: museumError } = await admin.from("museums")
      .select("id, portrait_path")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (museumError) throw new HttpError(503, "Could not load your museum.");
    if (!museum) throw new HttpError(404, "Museum not found.");

    if (portrait) {
      const normalized = await normalizeUpload(portrait, { maxEdge: 2400, quality: 90 });
      uploadedPath = `portraits/${user.id}/${crypto.randomUUID()}/portrait.webp`;
      const { error: uploadError } = await admin.storage.from("portraits").upload(uploadedPath, normalized, { contentType: "image/webp", cacheControl: "3600", upsert: false });
      if (uploadError) throw new HttpError(503, "Could not upload your portrait. Please try again.");
    }
    const nextPortrait = portraitAction === "remove" ? null : uploadedPath ?? museum.portrait_path;

    const { data, error } = await admin.rpc("update_museum_details_secure", {
      p_owner: user.id,
      p_museum: museum.id,
      p_name: parsed.data.name,
      p_username: parsed.data.username,
      p_title: parsed.data.title,
      p_portrait: nextPortrait,
    });
    if (error) {
      retainUpload = !error.code || !/^[0-9A-Z]{5}$/.test(error.code);
      throw new HttpError(error.code === "23505" ? 409 : 503, error.code === "23505"
        ? "That username or museum address is already taken."
        : "Could not save your changes.");
    }
    retainUpload = true;
    if (museum.portrait_path && museum.portrait_path !== nextPortrait) {
      try { await admin.storage.from("portraits").remove([museum.portrait_path]); } catch { /* private orphan; reconcile operationally */ }
    }
    return NextResponse.json({ ok: true, slug: data?.slug ?? parsed.data.username }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
  finally {
    if (uploadedPath && !retainUpload) {
      try { await createSupabaseAdminClient().storage.from("portraits").remove([uploadedPath]); } catch { /* private orphan; reconcile operationally */ }
    }
  }
}
