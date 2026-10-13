import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { HttpError, limitedBody, rateLimit, requireSameOrigin, securityError, visitorIdentity } from "@/lib/security";
import { rememberReferral, saveReferralEvent } from "@/lib/admin-analytics";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const visitor = await visitorIdentity(true);
    await rateLimit("referral-click", visitor, 30, 3600);
    const bytes = await limitedBody(request, 2048);
    let input;
    try { input = JSON.parse(bytes.toString("utf8")); } catch { throw new HttpError(400, "Invalid referral."); }
    if (!/^[a-f0-9-]{36}$/.test(input?.museum ?? "") || !["exhibit", "reveal"].includes(input?.source)) throw new HttpError(400, "Invalid referral.");
    const admin = createSupabaseAdminClient();
    const { data: museum, error } = await admin.from("museums").select("id,status").eq("analytics_id", input.museum).maybeSingle();
    if (error) throw new HttpError(503, "Analytics is temporarily unavailable.");
    if (!museum) throw new HttpError(404, "Museum not found.");
    if (input.source === "exhibit") {
      const { data: exhibit, error } = await admin.from("exhibits").select("id").eq("museum_id", museum.id).eq("visitor_hash", visitor).limit(1).maybeSingle();
      if (error) throw new HttpError(503, "Analytics is temporarily unavailable.");
      if (!exhibit) throw new HttpError(403, "Submit a memory first.");
      const saved = await saveReferralEvent("clicks", `${museum.id}-${visitor}`, { parentId: museum.id, visitor, source: "exhibit", at: new Date().toISOString() });
      if (!saved) throw new HttpError(503, "Analytics is temporarily unavailable.");
    } else if (museum.status !== "unlocked") throw new HttpError(403, "Museum is not open.");
    await rememberReferral(museum.id, visitor, input.source);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
}
