"use client";
import { useCallback, useState } from "react";
import { CreateMuseumForm } from "@/components/create-museum-form";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
import { InteriorIntro } from "@/components/scrapbook-ui";

export function CreateMuseumExperience() {
  const [preview, setPreview] = useState<{ name: string; portrait: string | null }>({ name: "", portrait: null });
  const updatePreview = useCallback((name: string, portrait: string | null) => { setPreview({ name, portrait }); }, []);
  return <div className="scrapbook-workspace create-workspace">
    <div className="creation-story"><InteriorIntro eyebrow="01 / A space with your name on it" title={<>Every little thing.<br /><em>Entirely you.</em></>} description="Make room for the way your people see you. A few details, and your collection begins." />
      <div className="creation-live-preview"><p className="interior-kicker">Your museum preview</p><HeroMemoryOrbit compact interactive={false} name={preview.name} portraitUrl={preview.portrait} /><p className="creation-preview-note">A first look only — your friends will fill it with the real stories.</p></div>
    </div>
    <section className="form-panel paper-form" aria-labelledby="create-form-title"><span className="paper-clip" aria-hidden="true" /><p className="interior-kicker">Just the essentials</p><h2 id="create-form-title" className="paper-form-title">Create your museum</h2><CreateMuseumForm onPreviewChange={updatePreview} /></section>
  </div>;
}
