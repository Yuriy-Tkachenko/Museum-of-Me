"use client";
import { useCallback, useState } from "react";
import { CreateMuseumForm } from "@/components/create-museum-form";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";

export function CreateMuseumExperience() {
  const [preview, setPreview] = useState<{ name: string; portrait: string | null }>({ name: "", portrait: null });
  const updatePreview = useCallback((name: string, portrait: string | null) => { setPreview({ name, portrait }); }, []);
  return <div className="grid items-start gap-9 md:grid-cols-2 md:gap-16">
    <div className="creation-story"><p className="eyebrow mb-6">01 / A space with your name on it</p><h1 className="display interior-heading">Every little thing.<br /><em className="gold-text">Entirely you.</em></h1><p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">Make room for the way your people see you. A few details, and your collection begins.</p>
      <div className="creation-live-preview"><p className="eyebrow">Your museum preview</p><HeroMemoryOrbit compact interactive={false} name={preview.name} portraitUrl={preview.portrait} /><p className="creation-preview-note">This is a preview. Your friends will add the real memories.</p></div>
    </div>
    <div className="form-panel"><p className="eyebrow mb-7">Create your museum</p><CreateMuseumForm onPreviewChange={updatePreview} /></div>
  </div>;
}
