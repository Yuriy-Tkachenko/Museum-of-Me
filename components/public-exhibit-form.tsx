"use client";
/* eslint-disable @next/next/no-img-element -- Pexels and user-selected previews are dynamic external/blob URLs. */

import { useEffect, useRef, useState } from "react";
import { CreateLink, TrackEvent } from "@/components/analytics";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/turnstile";

type ImageMode = "pexels" | "upload" | "none";
type Photo = { id: string; alt: string; author: string; authorUrl: string; url: string };
type UploadImage = { blob: Blob; preview: string; name: string };

export function PublicExhibitForm({ token, personName, analyticsId, pexelsEnabled = false, onSubmitted }: { token: string; personName: string; analyticsId?: string; pexelsEnabled?: boolean; onSubmitted?: () => void }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [mode, setMode] = useState<ImageMode>("none");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [upload, setUpload] = useState<UploadImage | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const submissionId = useRef("");
  const submitting = useRef(false);
  const session = useRef<Promise<Response> | null>(null);

  useEffect(() => {
    session.current = fetch("/api/security/session", { method: "POST" });
    void session.current.then((response) => { if (!response.ok) throw new Error(); setSessionReady(true); }).catch(() => setError("Could not initialize the form. Please refresh."));
    const key = `museum-submission:${token}`;
    try {
      submissionId.current = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, submissionId.current);
    } catch { submissionId.current = crypto.randomUUID(); }
  }, [token]);

  useEffect(() => { if (success) { const node = document.getElementById("submission-success"); node?.focus(); node?.scrollIntoView({ block: "start" }); } }, [success]);

  useEffect(() => () => { if (upload?.preview) URL.revokeObjectURL(upload.preview); }, [upload]);

  async function searchImages() {
    if (title.trim().length < 2) { setError("Enter what the exhibit is first."); return; }
    setSearching(true); setError(""); setPhotos([]); setSelectedPhoto(null);
    try {
      if (!(await session.current)?.ok) throw new Error("Please refresh the page.");
      const response = await fetch(`/api/pexels/search?q=${encodeURIComponent(title.trim())}`, { headers: { "X-Invite-Token": token } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not search images");
      setPhotos(data.photos ?? []);
      if (!data.photos?.length) setError("No images found. Try another title.");
    } catch (searchError) { setError(searchError instanceof Error ? searchError.message : "Could not search images"); }
    finally { setSearching(false); }
  }

  function selectMode(next: ImageMode) {
    setMode(next);
    setError("");
    if (next !== "pexels") setSelectedPhoto(null);
    if (next !== "upload") setUpload(null);
  }

  async function processUpload(file: File) {
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const allowedExtension = /\.(jpe?g|png|webp|heic|heif)$/i;
    if (!allowedMime.includes(file.type) || !allowedExtension.test(file.name)) { setError("Use a JPEG, PNG, WebP, or HEIC image."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("Images must be smaller than 12 MB."); return; }
    setError("");
    setProcessing(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .82));
      if (!blob) throw new Error("Your browser could not process this image.");
      if (blob.size > 4 * 1024 * 1024) throw new Error("Try a smaller photo.");
      if (upload?.preview) URL.revokeObjectURL(upload.preview);
      setUpload({ blob, preview: URL.createObjectURL(blob), name: "exhibit.webp" });
      setSelectedPhoto(null);
    } catch { setError("This image could not be processed. Try a smaller JPEG, PNG, or WebP."); }
    finally { setProcessing(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !turnstileToken) return;
    setLoading(true); setError("");
    if (mode === "pexels" && !selectedPhoto) { setError("Choose an image or select another option."); setLoading(false); return; }
    if (mode === "upload" && !upload) { setError("Choose an image to upload."); setLoading(false); return; }
    const formData = new FormData();
    submitting.current = true;
    formData.set("turnstileToken", turnstileToken);
    formData.set("submissionId", submissionId.current);
    formData.set("title", title); formData.set("caption", caption); formData.set("imageSource", mode);
    if (selectedPhoto) { formData.set("imageUrl", selectedPhoto.url); formData.set("imageSourceId", selectedPhoto.id); formData.set("imageAuthor", selectedPhoto.author); }
    if (upload) formData.set("file", upload.blob, upload.name);
    try {
      if (!(await session.current)?.ok) throw new Error("Please refresh the page.");
      const response = await fetch(`/api/museums/${encodeURIComponent(token)}/exhibits`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add exhibit");
      track("exhibit_submitted", { museum: data.analyticsId ?? analyticsId }, submissionId.current);
      if (data.unlocked) track("museum_unlocked", { museum: data.analyticsId ?? analyticsId }, data.analyticsId);
      setSuccess(true);
      onSubmitted?.();
      
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not add exhibit"); }
    finally { submitting.current = false; setLoading(false); setTurnstileToken(""); setResetKey((key) => key + 1); }
  }

  if (success) return <section id="submission-success" tabIndex={-1} role="status" className="mx-auto max-w-xl py-8 text-center md:py-12"><div className="memory-ticket">{(selectedPhoto || upload) ? <img src={selectedPhoto?.url ?? upload?.preview} alt="Your saved memory" /> : <div className="ticket-symbol" aria-hidden="true">✦</div>}<p translate="no">{title}</p><span className="ticket-seal" aria-hidden="true">✓</span></div><p className="eyebrow">Memory received</p><h2 className="display mt-6 text-5xl leading-[.95] md:text-6xl">A little piece of you.<br /><em className="gold-text">Saved for them.</em></h2><p className="mx-auto mt-7 max-w-sm text-sm leading-relaxed text-muted"><span translate="no">{personName}</span> will see your memory when the museum opens. Thank you for being part of it.</p><div className="mt-9 border-t border-accent/20 pt-8"><p className="mb-5 text-sm">What would your friends choose for you?</p><CreateLink source="exhibit" className="primary-link">Create my own museum ↗</CreateLink><p className="mt-4 text-xs text-muted">Your people. Your own little collection.</p></div></section>;

  return <form onSubmit={submit} onFocus={() => track("exhibit_started", { museum: analyticsId }, analyticsId ?? "invite")} aria-busy={loading || processing} className="border-t border-ink/15 pt-7 md:pt-0 md:border-t-0">
    <TrackEvent event="invite_opened" museum={analyticsId} onceKey={analyticsId ?? "invite"} /><p className="mb-7 text-xs leading-relaxed text-muted">No account needed · About 2 minutes · One memory per invitation</p><label className="mb-8 block"><span className="mb-3 block text-[10px] uppercase tracking-[.2em] text-muted">What is it?</span><input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Black coffee" className="w-full border-b border-ink/20 bg-transparent py-3 text-2xl outline-none placeholder:text-ink/20 focus:border-ink" /></label>
    <label className="mb-8 block"><span className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[.2em] text-muted"><span>Why?</span><span>{caption.length}/300</span></span><textarea required maxLength={300} rows={4} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Tell the story in a sentence or two." className="w-full resize-none border-b border-ink/20 bg-transparent py-3 text-lg outline-none placeholder:text-ink/20 focus:border-ink" /></label>
    <fieldset className="mb-8"><legend className="mb-3 block text-[10px] uppercase tracking-[.2em] text-muted">Choose an image</legend><div className="grid grid-cols-3 gap-2"><button type="button" disabled={!pexelsEnabled || loading} aria-pressed={mode === "pexels"} onClick={() => selectMode("pexels")} className={`rounded-xl border px-2 py-3 text-[10px] uppercase tracking-[.12em] transition-colors ${mode === "pexels" ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/40"}`}>Find an image</button><button type="button" disabled={loading || processing} aria-pressed={mode === "upload"} onClick={() => selectMode("upload")} className={`rounded-xl border px-2 py-3 text-[10px] uppercase tracking-[.12em] transition-colors ${mode === "upload" ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/40"}`}>Upload my own</button><button type="button" disabled={loading || processing} aria-pressed={mode === "none"} onClick={() => selectMode("none")} className={`rounded-xl border px-2 py-3 text-[10px] uppercase tracking-[.12em] transition-colors ${mode === "none" ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/40"}`}>No image</button></div></fieldset>
    {mode === "pexels" && <div className="mb-8 space-y-4"><div className="flex gap-2"><input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Image search" placeholder="Search by exhibit title" className="min-w-0 flex-1 rounded-full border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink" /><button type="button" onClick={searchImages} disabled={searching} className="rounded-full bg-ink px-4 text-xs text-paper">{searching ? "…" : "Search"}</button></div>{photos.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((photo) => <button type="button" key={photo.id} onClick={() => setSelectedPhoto(photo)} className={`relative aspect-square overflow-hidden rounded-xl ${selectedPhoto?.id === photo.id ? "ring-2 ring-accent ring-offset-2" : ""}`}><img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" /><span className="absolute inset-x-1 bottom-1 truncate rounded bg-paper/80 px-1 py-0.5 text-left text-[8px] text-ink">{photo.author}</span></button>)}</div>}</div>}
    {mode === "upload" && <label className="mb-8 block cursor-pointer rounded-2xl border border-dashed border-ink/20 px-5 py-7 text-center transition-colors hover:border-ink/50"><span className="block text-sm">Choose a JPEG, PNG, WebP, or HEIC</span><span className="mt-2 block text-xs text-muted">Up to 12 MB. We resize your photo before sending it.</span><input aria-label="Upload a photo" disabled={processing || loading} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void processUpload(file); }} className="sr-only" /></label>}
    {(selectedPhoto || upload) && <div className="mb-8 overflow-hidden rounded-2xl bg-ink"><div className="relative aspect-[16/10]"><img src={selectedPhoto?.url ?? upload?.preview} alt={selectedPhoto?.alt ?? title} className="h-full w-full object-cover opacity-90" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-paper/80 to-transparent p-4 pt-12 text-left text-ink"><p className="text-[10px] uppercase tracking-[.15em] text-ink/60">Preview</p><p className="display mt-1 text-2xl">{title || "Untitled exhibit"}</p></div></div></div>}
    {error && <p role="alert" className="mb-6 rounded-2xl bg-red-100 px-4 py-3 text-xs leading-relaxed text-red-800">{error}</p>}
    {processing && <p role="status" className="mb-4 text-sm text-muted">Preparing your photo…</p>}
    <p className="mb-5 text-xs leading-relaxed text-muted">Your memory stays hidden until the museum opens, then becomes part of the public gallery.</p>
    <Turnstile onToken={setTurnstileToken} resetKey={resetKey} />
    <Button size="lg" type="submit" className="w-full" disabled={loading || processing || !sessionReady || !turnstileToken}>{loading ? "Adding…" : "Add to museum"} <span>↗</span></Button>
  </form>;
}
