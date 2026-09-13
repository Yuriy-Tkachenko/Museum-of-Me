import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export class HttpError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}

export function securityError(error: unknown) {
  const known = error instanceof HttpError;
  return NextResponse.json({ error: known ? error.message : "Service temporarily unavailable." }, {
    status: known ? error.status : 503,
    headers: { "Cache-Control": "no-store", ...(known && error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) },
  });
}

export function appOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new HttpError(503, "Site URL is not configured.");
  return new URL(value).origin;
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin() || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "Request origin is not allowed.");
  }
}

export function digest(value: string) {
  const secret = process.env.SECURITY_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, "Security is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

const visitorCookie = process.env.NODE_ENV === "production" ? "__Host-museum-visitor" : "museum-visitor";
export async function visitorIdentity(create = false) {
  const jar = await cookies();
  const value = jar.get(visitorCookie)?.value ?? "";
  const [id, expires, signature] = value.split(".");
  if (/^[a-f0-9]{64}$/.test(id ?? "") && /^\d{13}$/.test(expires ?? "") && /^[a-f0-9]{64}$/.test(signature ?? "") && Number(expires) > Date.now()) {
    const expected = digest(`visitor:${id}.${expires}`);
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return digest(`identity:${id}`);
  }
  if (!create) throw new HttpError(403, "Refresh the page before continuing.");
  const nextId = randomBytes(32).toString("hex");
  const nextExpires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  jar.set(visitorCookie, `${nextId}.${nextExpires}.${digest(`visitor:${nextId}.${nextExpires}`)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 30 * 24 * 60 * 60,
  });
  return digest(`identity:${nextId}`);
}

// Shared, atomic Postgres counters survive restarts and multiple application instances.
// Never trust forwarded IP headers. Global budgets also bound cookie/account rotation.
export async function rateLimit(scope: string, identity: string, limit: number, seconds: number) {
  const { data, error } = await createSupabaseAdminClient().rpc("consume_rate_limit", {
    p_key: digest(`rate:${scope}:${identity}`), p_limit: limit, p_seconds: seconds,
  });
  if (error) throw new HttpError(503, "Request protection is temporarily unavailable.");
  if (data > 0) throw new HttpError(429, "Too many requests. Please try again later.", data);
}

export const invitePattern = /^(?:[a-f0-9]{64}|m-[a-f0-9]{32})$/;
export async function availableInvite(token: string) {
  if (!invitePattern.test(token)) throw new HttpError(404, "This invitation is not available.");
  const supabase = createSupabaseAdminClient();
  const { data: invite, error } = await supabase.from("invite_links").select("id, museum_id, expires_at").eq("token", token).maybeSingle();
  if (error) throw new HttpError(503, "Invitations are temporarily unavailable.");
  if (!invite || (invite.expires_at && Date.parse(invite.expires_at) <= Date.now())) throw new HttpError(404, "This invitation is not available.");
  const { data: museum, error: museumError } = await supabase.from("museums").select("status").eq("id", invite.museum_id).maybeSingle();
  if (museumError) throw new HttpError(503, "Invitations are temporarily unavailable.");
  if (!museum || museum.status !== "collecting") throw new HttpError(404, "This invitation is not available.");
  return invite;
}

// Content-Length is only a hint: bound actual bytes, including chunked requests.
export async function limitedBody(request: Pick<Request, "headers" | "body">, max: number) {
  const declared = Number(request.headers.get("content-length"));
  if (declared > max) throw new HttpError(413, "Request is too large.");
  if (!request.body) throw new HttpError(400, "Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new HttpError(503, "Verification is not configured.");
  if (!token || token.length > 2048) throw new HttpError(400, "Complete the verification first.");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!response.ok) throw new HttpError(503, "Verification is temporarily unavailable.");
  const result = await response.json();
  if (result.success !== true || result.action !== "submit_exhibit" || result.hostname !== new URL(appOrigin()).hostname) {
    throw new HttpError(400, "Verification expired or failed. Please try again.");
  }
}
