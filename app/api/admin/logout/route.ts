import { NextResponse } from "next/server";
import { requireAdmin, signOutAdmin } from "@/lib/admin-auth";
import { requireSameOrigin, securityError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request); await requireAdmin(); await signOutAdmin();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return securityError(error); }
}
