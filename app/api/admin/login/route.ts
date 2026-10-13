import { NextResponse } from "next/server";
import { checkAdminPassword, signInAdmin } from "@/lib/admin-auth";
import { HttpError, limitedBody, rateLimit, requireSameOrigin, securityError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit("admin-login", "all", 15, 900);
    const bytes = await limitedBody(request, 4096);
    let input;
    try { input = JSON.parse(bytes.toString("utf8")); } catch { throw new HttpError(400, "Проверьте логин и пароль."); }
    if (typeof input?.login !== "string" || typeof input?.password !== "string" || input.login.length > 100 || input.password.length > 256 || !input.password) {
      throw new HttpError(400, "Проверьте логин и пароль.");
    }
    if (!await checkAdminPassword(input.login.trim(), input.password)) throw new HttpError(401, "Неверный логин или пароль.");
    await signInAdmin();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return securityError(error); }
}
