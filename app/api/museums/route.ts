import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createMuseumSchema } from "@/lib/validation";
import { HttpError, limitedBody, rateLimit, requireSameOrigin, securityError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new HttpError(401, "You must be signed in to create a museum.");
    await rateLimit("museums-global", "all", 200, 3600);
    await rateLimit("museums-user", user.id, 5, 3600);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Expected JSON.");
    const bytes = await limitedBody(request, 8192);
    let body: unknown;
    try { body = JSON.parse(bytes.toString("utf8")); } catch { throw new HttpError(400, "Invalid JSON."); }
    const parsed = createMuseumSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid form.");
    const { data, error: createError } = await createSupabaseAdminClient().rpc("create_museum_secure", {
      p_owner: user.id, p_username: parsed.data.username, p_name: parsed.data.name, p_title: parsed.data.title, p_required: parsed.data.requiredExhibits,
    });
    if (createError) throw new HttpError(createError.code === "23505" ? 409 : 503, createError.code === "23505" ? "That username or museum already exists." : "Could not create your museum.");
    return NextResponse.json({ redirectTo: "/dashboard", museum: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
}
