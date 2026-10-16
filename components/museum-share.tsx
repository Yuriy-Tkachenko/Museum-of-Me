"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { EditorialSurface } from "@/components/editorial-surface";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LandingMotion } from "@/components/landing-motion";
import { copyText, cancelledShare } from "@/lib/sharing";
import { track, trackOperational } from "@/lib/analytics";
type Format = "story" | "square" | "og";

export function MuseumShare({ slug, name, unlocked, analyticsId }: { slug: string; name: string; unlocked: boolean; analyticsId?: string }) {
  const [format, setFormat] = useState<Format>("story");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const posterUrl = `/api/museums/${encodeURIComponent(slug)}/poster?format=${format}&v=${retry}`;
  const galleryUrl = () => `${window.location.origin}/museum/${encodeURIComponent(slug)}`;
  function recorded(method: "copy" | "native" | "download") { if (unlocked) { track("museum_shared", { museum: analyticsId, method, format }); trackOperational("museum_shared", { museum: analyticsId, method, format }); } }
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch(posterUrl);
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("Your poster could not be saved. Please try again.");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = href; anchor.download = `${slug}-museum-${format}.png`; document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000); recorded("download");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save your poster."); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    setError("");
    try { await copyText(galleryUrl()); setCopied(true); recorded("copy"); } catch (error) { setError(error instanceof Error ? error.message : "Copy failed."); }
  }
  async function share() {
    if (!navigator.share) return copyLink();
    setError("");
    try { await navigator.share({ title: `${name} — Museum of Me`, text: "A little portrait, made by my friends.", url: galleryUrl() }); recorded("native"); }
    catch (error) { if (!cancelledShare(error)) setError("Sharing is unavailable. Try copying the gallery link."); }
  }
  return <EditorialSurface className="app-shell grain editorial-home editorial-interior"><LandingMotion /><SiteHeader /><section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-8 md:grid-cols-[1fr_1fr] md:items-center md:gap-16 md:px-10 md:pt-12">
    <div className="min-w-0"><Link href={`/museum/${slug}`} className="inline-flex min-h-11 items-center text-xs text-ink/60 underline underline-offset-4">← Back to the museum</Link><p className="mb-6 mt-7 text-[10px] uppercase tracking-[.25em] text-ink/55">A poster for your collection</p><h1 className="display text-6xl leading-[.88] md:text-8xl">A little piece<br /><span className="italic text-accent">of your world.</span></h1><p className="mt-7 max-w-sm text-sm leading-relaxed text-ink/65">Choose a format, save your poster, and let your friends step inside the gallery.</p>
    <div role="group" aria-label="Poster format" className="mt-8 flex flex-wrap gap-2">{(["story", "square", "og"] as Format[]).map((item) => <button key={item} type="button" aria-pressed={format === item} onClick={() => { setFormat(item); setImageError(false); setImageReady(false); setError(""); }} className={`min-h-11 rounded-md border px-4 text-xs ${format === item ? "border-accent bg-accent text-paper" : "border-accent/25 text-ink/70"}`}>{item === "story" ? "Story · 9:16" : item === "square" ? "Square · 1:1" : "Landscape · 1.91:1"}</button>)}</div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={download} disabled={busy || !imageReady || imageError} className="h-14 rounded-md bg-accent px-6 text-sm text-paper">{busy ? "Saving…" : "Download PNG ↓"}</button><button type="button" onClick={share} className="h-14 rounded-md border border-accent/25 px-6 text-sm">Share museum ↗</button></div><button type="button" onClick={copyLink} className="mt-3 min-h-11 text-xs text-ink/70 underline underline-offset-4">{copied ? "Gallery link copied ✓" : "Copy gallery link"}</button><p role="status" className="mt-1 text-xs text-ink/55">{copied ? "Your friends will open the museum, not this poster page." : "PNG image · Ready for messages, posts and stories."}</p>
    {error && <div role="alert" className="mt-5 rounded-xl border border-red-200/20 bg-red-100/10 p-4 text-sm text-red-100"><p>{error}</p><input readOnly aria-label="Gallery link" value={typeof window === "undefined" ? `/museum/${slug}` : galleryUrl()} onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full bg-transparent text-xs" /></div>}
    {!unlocked && <p className="mt-6 text-sm text-ink/60">This gallery is still collecting. Its poster will fill with memories when it opens.</p>}</div>
    <div className="share-stage relative mx-auto w-full max-w-[410px]"><div className={`share-frame overflow-hidden ${format === "story" ? "aspect-[9/16]" : format === "square" ? "aspect-square" : "aspect-[1200/630]"}`}>{!imageError && <img key={posterUrl} src={posterUrl} alt={`${name} Museum of Me poster`} onLoad={() => setImageReady(true)} onError={() => setImageError(true)} className="h-full w-full object-cover" />}{!imageReady && !imageError && <p role="status" className="absolute inset-0 flex items-center justify-center bg-paper text-sm text-muted">Making your poster…</p>}{imageError && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-paper p-6 text-center text-ink"><p>We couldn’t load this poster.</p><button onClick={() => { setRetry((n) => n + 1); setImageError(false); }} className="min-h-11 rounded-md border border-ink/20 px-5 text-sm">Try again</button></div>}</div><p className="mt-4 text-center text-[10px] uppercase tracking-widest text-ink/45">{format === "story" ? "1080 × 1920" : format === "square" ? "1080 × 1080" : "1200 × 630"} · PNG</p></div>
  </section><SiteFooter /></EditorialSurface>;
}
