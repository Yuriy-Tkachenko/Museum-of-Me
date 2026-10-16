import { NextResponse } from "next/server";
import { operationalEventNames, saveOperationalEvent, type OperationalEventName } from "@/lib/admin-analytics";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { HttpError, limitedBody, rateLimit, requireSameOrigin, securityError, visitorIdentity } from "@/lib/security";

const uuid = /^[a-f0-9-]{36}$/;
const methods = ["copy", "native", "download"] as const;
const formats = ["story", "square", "og"] as const;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const visitor = await visitorIdentity(true);
    await rateLimit("operational-analytics", visitor, 120, 3600);
    const bytes = await limitedBody(request, 2048);
    let input: { museum?: string; event?: OperationalEventName; method?: string; format?: string };
    try { input = JSON.parse(bytes.toString("utf8")); } catch { throw new HttpError(400, "Invalid analytics event."); }
    if (!uuid.test(input.museum ?? "") || !operationalEventNames.includes(input.event as OperationalEventName)) throw new HttpError(400, "Invalid analytics event.");
    if (input.event === "museum_shared" && (!methods.includes(input.method as typeof methods[number]) || !formats.includes(input.format as typeof formats[number]))) {
      throw new HttpError(400, "Invalid analytics event.");
    }
    const admin = createSupabaseAdminClient();
    const { data: museum, error } = await admin.from("museums").select("id,status").eq("analytics_id", input.museum).maybeSingle();
    if (error) throw new HttpError(503, "Analytics is temporarily unavailable.");
    if (!museum) throw new HttpError(404, "Museum not found.");
    if ((input.event === "museum_viewed" || input.event === "museum_shared") && museum.status !== "unlocked") throw new HttpError(403, "Museum is not open.");
    if ((input.event === "invite_opened" || input.event === "exhibit_started") && museum.status !== "collecting") throw new HttpError(403, "Invitation is closed.");
    const suffix = input.event === "museum_shared" ? `-${input.method}-${input.format}` : "";
    const saved = await saveOperationalEvent(`${input.event}-${museum.id}-${visitor}${suffix}`, {
      museumId: museum.id,
      visitor,
      event: input.event!,
      at: new Date().toISOString(),
      ...(input.event === "museum_shared" ? { method: input.method as typeof methods[number], format: input.format as typeof formats[number] } : {}),
    });
    if (!saved) throw new HttpError(503, "Analytics is temporarily unavailable.");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
}
