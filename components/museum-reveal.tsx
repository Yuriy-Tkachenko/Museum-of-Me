"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { EditorialSurface } from "@/components/editorial-surface";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CreateLink, TrackEvent } from "@/components/analytics";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
import { LandingMotion } from "@/components/landing-motion";
export type RevealExhibit = { id: string; title: string; caption: string; imageUrl: string | null; symbol: string; color: string };
function ExhibitScene({ exhibit, index, total }: { exhibit: RevealExhibit; index: number; total: number }) {
 const [failed, setFailed] = useState(false);
 return <section id={`exhibit-${index + 1}`} className="gallery-scene"><div className="gallery-scene-inner">
 <div className="gallery-artwork" style={{ opacity: 1 }}>{exhibit.imageUrl && !failed ? <img src={exhibit.imageUrl} alt={exhibit.title} onError={() => setFailed(true)} /> : <div className="gallery-symbol" aria-hidden="true">{exhibit.symbol}</div>}</div>
 <div className="gallery-caption"><span className="eyebrow">Memory {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span><h2 translate="no" className="display">{exhibit.title}</h2><p translate="no">“{exhibit.caption}”</p><small>A little piece of how they see you</small></div>
 </div></section>;
}
export function MuseumReveal({ name, slug, exhibits, analyticsId, portraitUrl = null, demo = false }: { name: string; slug: string; exhibits: RevealExhibit[]; analyticsId?: string; portraitUrl?: string | null; demo?: boolean }) {
 return <EditorialSurface className="app-shell grain editorial-home editorial-interior scrapbook-theme reveal-page"><LandingMotion />{!demo && <TrackEvent event="museum_viewed" museum={analyticsId} onceKey={analyticsId ?? "gallery"} />}<SiteHeader />
 <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-[10px] text-muted md:px-10"><span>{demo ? "A sample museum · Fictional memories" : "The doors are open. Welcome to your world."}</span>{!demo && <Link href={`/museum/${slug}/share`} className="quiet-link">Make a share poster ↗</Link>}</div>
 <section className="gallery-hero"><span className="eyebrow">The museum of</span><h1 translate="no" className="display gold-text">{name}</h1><p>A portrait made of {exhibits.length} little memories.<br />Chosen by the people who know you best.</p>{demo ? <div className="gallery-demo-orbit"><HeroMemoryOrbit /></div> : <div className="gallery-demo-orbit"><HeroMemoryOrbit memories={exhibits} name={name} portraitUrl={portraitUrl} /></div>}<a href="#exhibit-1" className="quiet-link mb-8">Step inside <span>↓</span></a></section>
 <div>{exhibits.map((exhibit,index) => <ExhibitScene key={exhibit.id} exhibit={exhibit} index={index} total={exhibits.length} />)}</div>
 <section className="closing-invitation"><p className="eyebrow">The final room</p><h2 className="display">Little things.<br /><em className="gold-text">A whole person.</em></h2><div className="flex flex-wrap items-center justify-center gap-6">{!demo && <Link href={`/museum/${slug}/share`} className="primary-link">Share this museum ↗</Link>}<CreateLink source="reveal" museum={analyticsId} className={demo ? "primary-link" : "quiet-link"}>Create my own museum ↗</CreateLink></div><p>The ordinary moments are the ones that stay with us.</p></section><SiteFooter /></EditorialSurface>;
}
