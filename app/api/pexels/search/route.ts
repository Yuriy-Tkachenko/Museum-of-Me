import { NextResponse } from "next/server";
import { z } from "zod";
import { availableInvite, HttpError, rateLimit, securityError, visitorIdentity } from "@/lib/security";
import { isPexelsImage } from "@/lib/media";

const querySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  try {
    const visitor = await visitorIdentity();
    await rateLimit("pexels-global", "all", 500, 3600);
    await rateLimit("pexels-visitor", visitor, 20, 60);
    const invite = await availableInvite(request.headers.get("x-invite-token") ?? "");
    await rateLimit("pexels-invite", invite.id, 60, 60);
  const query = querySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ error: "Enter an exhibit title first." }, { status: 400 });
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Image search is not configured yet." }, { status: 503 });

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query.data)}&per_page=8&orientation=landscape`, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(8000), next: { revalidate: 60 } });
    if (!response.ok) return NextResponse.json({ error: "Pexels could not find images right now." }, { status: 502 });
    const data = await response.json() as { photos?: Array<{ id: number; alt: string; photographer: string; photographer_url: string; src: { medium: string; large2x: string } }> };
    return NextResponse.json({ photos: (data.photos ?? []).filter((photo) => isPexelsImage(photo.src.large2x || photo.src.medium)).map((photo) => ({ id: String(photo.id), alt: photo.alt.slice(0, 300), author: photo.photographer.slice(0, 160), authorUrl: photo.photographer_url, url: photo.src.large2x || photo.src.medium })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    throw new HttpError(502, "Image search is temporarily unavailable.");
  }
  } catch (error) { return securityError(error); }
}
