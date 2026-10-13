import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MuseumShare } from "@/components/museum-share";
import { getPublicMuseum } from "@/lib/public-museum";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getPublicMuseum(slug);
  if (!museum.exists) return { title: "Museum not found — Museum of Me" };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { title: `${museum.name} — Museum of Me`, description: "A museum made by the people who know you best.", openGraph: { title: `${museum.name} — Museum of Me`, description: "A museum made by the people who know you best.", images: [`${base}/api/museums/${slug}/poster?format=og`] } };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const museum = await getPublicMuseum(slug);
  if (!museum.exists) notFound();
  return <MuseumShare slug={museum.slug} name={museum.name} unlocked={museum.unlocked} analyticsId={museum.analyticsId} />;
}
