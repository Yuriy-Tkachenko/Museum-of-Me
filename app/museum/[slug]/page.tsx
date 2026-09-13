import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { MemoryUniverse } from "@/components/memory-universe";
import { MuseumReveal } from "@/components/museum-reveal";
import { getPublicMuseum as getMuseumState } from "@/lib/public-museum";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params; const museum = await getMuseumState(slug);
 if (!museum.exists) return { title: "Museum not found — Museum of Me" };
 const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
 return { title: `${museum.name} — Museum of Me`, description: "How my friends see me.", openGraph: { title: `${museum.name} — Museum of Me`, description: "How my friends see me.", images: [`${base}/api/museums/${slug}/poster?format=og`] } };
}
export default async function MuseumPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params; const museum = await getMuseumState(slug);
 if (!museum.exists) return <PageShell><section className="mx-auto max-w-xl px-5 py-24 text-center"><span className="text-5xl gold-text" aria-hidden="true">✧</span><p className="eyebrow mb-6 mt-8">Museum not found</p><h1 className="display text-6xl leading-[.95]">This little world<br /><em className="gold-text">isn’t here.</em></h1><Link href="/create" className="primary-link mt-10">Create a museum ↗</Link></section></PageShell>;
 if (!museum.unlocked) return <PageShell><section className="gallery-hero"><span className="eyebrow">A private collection</span><h1 className="display !text-5xl md:!text-7xl">The museum<br /><em className="gold-text">is still forming.</em></h1><p>The doors will open when enough memories have been collected. Some things are worth the wait.</p><MemoryUniverse name={museum.name} hidden interactive={false} /></section></PageShell>;
 return <MuseumReveal name={museum.name} slug={museum.slug} exhibits={museum.exhibits} analyticsId={museum.analyticsId} />;
}

