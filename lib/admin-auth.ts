import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { HttpError } from "@/lib/security";

const derive = promisify(scrypt);
const cookieName = "museum-admin";
const lifetime = 8 * 60 * 60;

function configuration() {
  const login = process.env.ADMIN_LOGIN;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!login || !hash || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash) || !secret || secret.length < 32) {
    throw new HttpError(503, "Доступ администратора ещё не настроен.");
  }
  return { login, hash, secret };
}

function signature(value: string) {
  const { login, hash, secret } = configuration();
  return createHmac("sha256", secret).update(`admin:${login}:${hash}:${value}`).digest("hex");
}

export async function checkAdminPassword(login: string, password: string) {
  const config = configuration();
  const [salt, hash] = config.hash.split(":");
  const candidate = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(candidate, Buffer.from(hash, "hex")) && login === config.login;
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
