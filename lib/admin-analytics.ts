import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { digest } from "@/lib/security";

export const adminAnalyticsBucket = "museum-admin-analytics";
const attributionCookie = "museum-referral";
const attributionLifetime = 30 * 24 * 60 * 60;
const uuid = /^[a-f0-9-]{36}$/;

export type ReferralEvent = { parentId: string; childId?: string; visitor?: string; source: "exhibit" | "reveal"; at: string };
export const operationalEventNames = ["invite_opened", "exhibit_started", "museum_viewed", "museum_shared"] as const;
export type OperationalEventName = typeof operationalEventNames[number];
export type OperationalEvent = {
  museumId: string;
  visitor: string;
  event: OperationalEventName;
  at: string;
  method?: "copy" | "native" | "download";
  format?: "story" | "square" | "og";
};

export async function saveReferralEvent(folder: "clicks" | "births", key: string, event: ReferralEvent) {
  try {
    const { error } = await createSupabaseAdminClient().storage.from(adminAnalyticsBucket).upload(`${folder}/${key}.json`,
      Buffer.from(JSON.stringify(event)), { contentType: "application/json", upsert: false });
    return !error || error.statusCode === "409" || error.message === "The resource already exists";
  } catch { return false; }
}

export async function saveOperationalEvent(key: string, event: OperationalEvent) {
  try {
    const { error } = await createSupabaseAdminClient().storage.from(adminAnalyticsBucket).upload(`funnel/${key}.json`,
      Buffer.from(JSON.stringify(event)), { contentType: "application/json", upsert: false });
    return !error || error.statusCode === "409" || error.message === "The resource already exists";
  } catch { return false; }
}

export async function rememberReferral(parentId: string, visitor: string, source: "exhibit" | "reveal") {
  const payload = `${parentId}.${visitor}.${source}.${Date.now() + attributionLifetime * 1000}`;
  (await cookies()).set(attributionCookie, `${payload}.${digest(`referral:${payload}`)}`, {
    httpOnly: true, secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
    sameSite: "lax", path: "/", maxAge: attributionLifetime,
  });
}

export async function recordMuseumBirth(childAnalyticsId: string, ownerId: string) {
  try {
    const value = (await cookies()).get(attributionCookie)?.value;
    if (!value || !uuid.test(childAnalyticsId)) return;
    const [parentId, visitor, source, expires, mac, extra] = value.split(".");
    if (extra || !uuid.test(parentId) || !/^[a-f0-9]{64}$/.test(visitor) || !["exhibit", "reveal"].includes(source)
      || !/^\d{13}$/.test(expires) || Number(expires) <= Date.now() || !/^[a-f0-9]{64}$/.test(mac)) return;
    if (!timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(digest(`referral:${parentId}.${visitor}.${source}.${expires}`), "hex"))) return;
    const admin = createSupabaseAdminClient();
    const { data: child, error } = await admin.from("museums").select("id").eq("analytics_id", childAnalyticsId).eq("owner_id", ownerId).single();
    if (error || !child || child.id === parentId) return;
    const { data: parent, error: parentError } = await admin.from("museums").select("id").eq("id", parentId).maybeSingle();
    if (parentError || !parent) return;
    await saveReferralEvent("births", child.id, { parentId, childId: child.id, source: source as "exhibit" | "reveal", at: new Date().toISOString() });
  } catch { /* Attribution must not interrupt a successful museum creation. */ }
}

export async function listReferralEvents(folder: "clicks" | "births") {
  const storage = createSupabaseAdminClient().storage.from(adminAnalyticsBucket);
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(folder, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("Не удалось загрузить события аналитики.");
    files.push(...data.filter(item => item.name.endsWith(".json")).map(item => `${folder}/${item.name}`));
    if (data.length < 1000) break;
  }
  const events: ReferralEvent[] = [];
  // Bound parallel downloads rather than starting thousands of requests.
  for (let i = 0; i < files.length; i += 20) {
    const batch = await Promise.all(files.slice(i, i + 20).map(async path => {
      const { data, error } = await storage.download(path);
      if (error || !data) throw new Error("Не удалось загрузить события аналитики.");
      const event = JSON.parse(await data.text()) as ReferralEvent;
      if (!uuid.test(event.parentId) || !["exhibit", "reveal"].includes(event.source) || !Number.isFinite(Date.parse(event.at))) throw new Error("Некорректное событие аналитики.");
      return event;
    }));
    events.push(...batch);
  }
  return events;
}

export async function listOperationalEvents() {
  const storage = createSupabaseAdminClient().storage.from(adminAnalyticsBucket);
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list("funnel", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("Не удалось загрузить события воронки.");
    files.push(...data.filter(item => item.name.endsWith(".json")).map(item => `funnel/${item.name}`));
    if (data.length < 1000) break;
  }
  const events: OperationalEvent[] = [];
  for (let i = 0; i < files.length; i += 20) {
    const batch = await Promise.all(files.slice(i, i + 20).map(async path => {
      const { data, error } = await storage.download(path);
      if (error || !data) throw new Error("Не удалось загрузить события воронки.");
      const event = JSON.parse(await data.text()) as OperationalEvent;
      if (!uuid.test(event.museumId) || !/^[a-f0-9]{64}$/.test(event.visitor) || !operationalEventNames.includes(event.event)
        || !Number.isFinite(Date.parse(event.at))) throw new Error("Некорректное событие воронки.");
      if (event.method && !["copy", "native", "download"].includes(event.method)) throw new Error("Некорректное событие воронки.");
      if (event.format && !["story", "square", "og"].includes(event.format)) throw new Error("Некорректное событие воронки.");
      return event;
    }));
    events.push(...batch);
  }
  return events;
}
