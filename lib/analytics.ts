export const analyticsEvents = ["landing_view", "create_started", "signup_completed", "museum_created", "invite_copied", "invite_opened", "exhibit_started", "exhibit_submitted", "viral_cta_clicked", "museum_unlocked", "museum_viewed", "museum_shared"] as const;
export type AnalyticsEvent = typeof analyticsEvents[number];
export type AnalyticsProps = { museum?: string; source?: "landing" | "exhibit" | "reveal" | "direct"; method?: "copy" | "native" | "download"; format?: "story" | "square" | "og"; target?: number };

export function analyticsEndpoint() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || "https://plausible.io/api/event");
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) return null;
    return url.href;
  } catch { return null; }
}

function enabled() {
  return typeof window !== "undefined" && process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible" && Boolean(process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN)
    && navigator.doNotTrack !== "1" && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
}

const seen = new Set<string>();
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}, onceKey?: string) {
  if (!enabled() || !analyticsEvents.includes(event)) return;
  const endpoint = analyticsEndpoint();
  if (!endpoint) return;
  if (onceKey) {
    const key = `museum-event:${event}:${onceKey}`;
    if (seen.has(key)) return;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* storage is optional */ }
    seen.add(key);
  }
  const safe: AnalyticsProps = {};
  if (props.museum && /^[a-f0-9-]{36}$/.test(props.museum)) safe.museum = props.museum;
  if (["landing", "exhibit", "reveal", "direct"].includes(props.source ?? "")) safe.source = props.source;
  if (["copy", "native", "download"].includes(props.method ?? "")) safe.method = props.method;
  if (["story", "square", "og"].includes(props.format ?? "")) safe.format = props.format;
  if (Number.isInteger(props.target) && props.target! >= 1 && props.target! <= 100) safe.target = props.target;
  // Send a synthetic screen URL: never location.href, slug, invite token, query or referrer.
  const screen = event.startsWith("invite_") || event.startsWith("exhibit_") ? "/invite" : event === "landing_view" ? "/" : event.startsWith("museum_") ? "/museum" : "/create";
  void fetch(endpoint, { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
    headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ name: event, domain: process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN, url: `${window.location.origin}${screen}`, props: safe }),
  }).catch(() => { /* Analytics must never block a user action. */ });
}

export function rememberSource(source: AnalyticsProps["source"]) {
  if (!enabled()) return;
  try { sessionStorage.setItem("museum-create-source", source ?? "direct"); } catch { /* optional */ }
}
export function creationSource(): AnalyticsProps["source"] {
  try { const value = sessionStorage.getItem("museum-create-source"); return value === "exhibit" || value === "reveal" || value === "landing" ? value : "direct"; } catch { return "direct"; }
}
