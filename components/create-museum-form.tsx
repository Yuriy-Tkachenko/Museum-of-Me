"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { track, creationSource } from "@/lib/analytics";
import { TrackEvent } from "@/components/analytics";

export function CreateMuseumForm() {
  const router = useRouter();
  const submitting = useRef(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [requiredExhibits, setRequiredExhibits] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateName(value: string) {
    setName(value);
    if (!titleEdited) setTitle(value.trim() ? `Museum of ${value.trim().slice(0, 80)}` : "");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return; submitting.current = true; setLoading(true); setError("");
    try {
      const response = await fetch("/api/museums", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, title, requiredExhibits: Number(requiredExhibits) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create museum");
      track("museum_created", { museum: data.museum.analyticsId, target: Number(requiredExhibits), source: creationSource() }, data.museum.analyticsId);
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create museum");
      submitting.current = false;
      setLoading(false);
    }
  }

  return <form onSubmit={submit} aria-busy={loading} className="space-y-8 border-t border-ink/15 pt-6 md:pt-0 md:border-t-0"><TrackEvent event="create_started" />
    <label className="block"><span className="mb-3 block text-[10px] uppercase tracking-[.2em] text-muted">Your name</span><input required autoComplete="given-name" maxLength={80} value={name} onChange={(event) => updateName(event.target.value)} placeholder="e.g. Mila Petrova" className="w-full border-b border-ink/20 bg-transparent py-3 text-2xl outline-none placeholder:text-ink/20 focus:border-ink" /></label>
    <label className="block"><span className="mb-3 block text-[10px] uppercase tracking-[.2em] text-muted">Museum address</span><div className="flex items-center border-b border-ink/20 focus-within:border-ink"><span className="text-2xl text-ink/30">@</span><input required minLength={3} autoCapitalize="none" autoComplete="username" pattern="[a-z0-9_]{3,32}" maxLength={32} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="mila" className="w-full bg-transparent py-3 text-2xl outline-none placeholder:text-ink/20" /></div></label>
    <label className="block"><span className="mb-3 block text-[10px] uppercase tracking-[.2em] text-muted">Museum title</span><input required maxLength={100} value={title} onChange={(event) => { setTitleEdited(true); setTitle(event.target.value); }} placeholder="Museum of Mila" className="w-full border-b border-ink/20 bg-transparent py-3 text-2xl outline-none placeholder:text-ink/20 focus:border-ink" /></label>
    <label className="block"><span className="mb-3 block text-[10px] uppercase tracking-[.2em] text-muted">Required exhibits</span><select value={requiredExhibits} onChange={(event) => setRequiredExhibits(event.target.value)} className="w-full border-b border-ink/20 bg-transparent py-3 text-2xl outline-none"><option value="3">3 exhibits - a small circle</option><option value="5">5 exhibits</option><option value="8">8 exhibits</option><option value="12">12 exhibits</option><option value="20">20 exhibits</option></select></label>
    {error && <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-xs leading-relaxed text-red-800">{error}</p>}
    <div className="pt-3"><Button size="lg" type="submit" disabled={loading}>{loading ? "Creating…" : "Create museum ↗"}</Button><p className="mt-4 text-xs text-muted">Choose your threshold carefully. Memories stay hidden until this many friends contribute, then your gallery becomes public.</p></div>
  </form>;
}
