import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "@/lib/security";

const cookieName = "museum-admin";
const lifetime = 8 * 60 * 60;
const defaultAdminEmail = "yuriy.tk4ko@gmail.com";

export function adminEmail() {
  return (process.env.ADMIN_EMAIL || defaultAdminEmail).trim().toLowerCase();
}

export function isAdminGoogleUser(user: { email?: string | null; app_metadata?: { provider?: string; providers?: string[] } } | null | undefined) {
  const providers = user?.app_metadata?.providers ?? [];
  return user?.email?.toLowerCase() === adminEmail() && (user.app_metadata?.provider === "google" || providers.includes("google"));
}

function configuration() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const email = adminEmail();
  if (!/^\S+@\S+\.\S+$/.test(email) || !secret || secret.length < 32) {
    throw new HttpError(503, "Доступ администратора ещё не настроен.");
  }
  return { email, secret };
}

function signature(value: string) {
  const { email, secret } = configuration();
  return createHmac("sha256", secret).update(`admin:${email}:${value}`).digest("hex");
}

export async function signInAdmin() {
  const expires = Date.now() + lifetime * 1000;
  const value = `${expires}.${randomBytes(24).toString("hex")}`;
  (await cookies()).set(cookieName, `${value}.${signature(value)}`, {
    httpOnly: true, secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
    sameSite: "strict", path: "/", maxAge: lifetime,
  });
}

export async function isAdmin() {
  try {
    const value = (await cookies()).get(cookieName)?.value;
    if (!value) return false;
    const [expires, nonce, mac, extra] = value.split(".");
    if (extra || !/^\d{13}$/.test(expires) || !/^[a-f0-9]{48}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)
      || Number(expires) <= Date.now() || Number(expires) > Date.now() + lifetime * 1000 + 60000) return false;
    return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(signature(`${expires}.${nonce}`), "hex"));
  } catch { return false; }
}

export async function requireAdmin() {
  if (!await isAdmin()) throw new HttpError(401, "Войдите как администратор.");
}

export async function signOutAdmin() { (await cookies()).delete(cookieName); }
