"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PortraitUpload, type PortraitDraft } from "@/components/portrait-upload";

export function MuseumSettingsForm({ initialName, initialUsername, initialTitle, initialPortrait }: { initialName: string; initialUsername: string; initialTitle: string; initialPortrait: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [portrait, setPortrait] = useState<PortraitDraft | null>(null);
  const [removePortrait, setRemovePortrait] = useState(false);
  const [preparingPortrait, setPreparingPortrait] = useState(false);
  useEffect(() => () => { if (portrait) URL.revokeObjectURL(portrait.preview); }, [portrait]);
  useEffect(() => {
    const open = () => {
      setEditing(true); setSaved(false);
      requestAnimationFrame(() => document.getElementById("personal-information")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("museum-edit-personal-information", open);
    return () => window.removeEventListener("museum-edit-personal-information", open);
  }, []);

  function cancel() {
    setName(initialName); setUsername(initialUsername); setTitle(initialTitle);
    setPortrait(null); setRemovePortrait(false); setError(""); setSaved(false); setEditing(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || preparingPortrait) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const fields = { name, username, title };
      let body: FormData | string = JSON.stringify(fields);
      if (portrait || removePortrait) {
        body = new FormData();
        for (const [key, fieldValue] of Object.entries(fields)) body.set(key, fieldValue);
        if (portrait) body.set("portrait", portrait.file);
        else body.set("portraitAction", "remove");
      }
      const response = await fetch("/api/museums/settings", { method: "PATCH", ...(body instanceof FormData ? {} : { headers: { "Content-Type": "application/json" } }), body });
      const data = await response.json();
      if (response.status === 401) { router.push("/auth"); return; }
      if (response.status === 403) { router.push("/auth/mfa?next=/dashboard"); return; }
      if (!response.ok) throw new Error(data.error ?? "Could not save your changes.");
      setSaved(true); setEditing(false); router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your changes.");
    } finally { setSaving(false); }
  }

  if (!editing) return saved ? <span role="status" className="mt-4 block text-xs text-muted">Changes saved.</span> : null;

  return <form id="personal-information" onSubmit={submit} className="mt-7 grid max-w-2xl scroll-mt-24 gap-5 rounded-2xl border border-ink/15 bg-paper/60 p-5" aria-busy={saving}>
    <div><p className="eyebrow">Personal information</p><p className="mt-2 text-xs leading-relaxed text-muted">Your name and museum title are public. Changing the address also changes the museum page URL.</p></div>
    <label className="block text-[10px] uppercase tracking-[.16em] text-muted">Your name<input required autoComplete="name" maxLength={80} value={name} onChange={event => setName(event.target.value)} className="mt-2 w-full border-b border-ink/20 bg-transparent py-2 text-lg normal-case tracking-normal text-ink outline-none focus:border-ink" /></label>
    <label className="block text-[10px] uppercase tracking-[.16em] text-muted">Museum address<div className="mt-2 flex border-b border-ink/20 focus-within:border-ink"><span className="py-2 text-lg text-ink/35">@</span><input required minLength={3} maxLength={32} pattern="[a-z0-9_]{3,32}" autoCapitalize="none" autoComplete="username" value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="min-w-0 flex-1 bg-transparent py-2 text-lg normal-case tracking-normal text-ink outline-none" /></div></label>
    <label className="block text-[10px] uppercase tracking-[.16em] text-muted">Museum title<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} className="mt-2 w-full border-b border-ink/20 bg-transparent py-2 text-lg normal-case tracking-normal text-ink outline-none focus:border-ink" /></label>
    <PortraitUpload value={portrait} initialPreview={removePortrait ? null : initialPortrait} onChange={next => { setPortrait(next); setRemovePortrait(!next); }} onBusy={setPreparingPortrait} disabled={saving} />
    {error && <p role="alert" className="rounded-xl bg-red-100 p-3 text-xs text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving || preparingPortrait}>{saving ? "Saving…" : "Save changes"}</Button><button type="button" disabled={saving || preparingPortrait} onClick={cancel} className="min-h-11 px-4 text-xs text-muted underline underline-offset-4">Cancel</button></div>
  </form>;
}
