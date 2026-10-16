import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
import { MuseumReveal } from "@/components/museum-reveal";
import { StatusScene } from "@/components/scrapbook-ui";
import { getPublicMuseum as getMuseumState } from "@/lib/public-museum";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const museum = await getMuseumState(slug);
  if (!museum.exists) return { title: "Museum not found — Museum of Me" };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { title: `${museum.name} — Museum of Me`, description: "How my friends see me.", openGraph: { title: `${museum.name} — Museum of Me`, description: "How my friends see me.", images: [`${base}/api/museums/${slug}/poster?format=og`] } };
}

export default async function MuseumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const museum = await getMuseumState(slug);
  if (!museum.exists) return <PageShell><StatusScene eyebrow="Museum not found" title={<>This little world<br /><em>isn’t here.</em></>} description="The address may have changed, or this museum has been removed." actionHref="/create" actionLabel="Create a museum" symbol="✧" /></PageShell>;
  if (!museum.unlocked) return <PageShell><section className="locked-museum"><div className="locked-copy"><p className="interior-kicker">A private collection</p><h1 className="interior-title">The museum<br /><em>is still forming.</em></h1><p className="interior-description">The doors will open when enough memories have been collected. Some things are worth the wait.</p><span className="lock-note" aria-hidden="true">still a surprise ♡</span></div><div className="locked-orbit"><HeroMemoryOrbit name={museum.name} portraitUrl={null} hidden interactive={false} /></div></section></PageShell>;
  return <MuseumReveal name={museum.name} slug={museum.slug} exhibits={museum.exhibits} analyticsId={museum.analyticsId} portraitUrl={museum.portraitUrl} />;
}
