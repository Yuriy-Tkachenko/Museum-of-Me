import { NextResponse } from "next/server";
import { requireSameOrigin, visitorIdentity, securityError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await visitorIdentity(true);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return securityError(error); }
}
