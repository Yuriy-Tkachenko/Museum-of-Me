import { NextResponse } from "next/server";
import { isAdminGoogleUser, signInAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HttpError, rateLimit, requireSameOrigin, securityError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit("admin-login", "all", 15, 900);
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !isAdminGoogleUser(user)) throw new HttpError(403, "Войдите через разрешённый Google-аккаунт.");
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || aal.currentLevel !== "aal2") throw new HttpError(403, "Подтвердите код Authenticator.");
    await signInAdmin();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return securityError(error); }
}
