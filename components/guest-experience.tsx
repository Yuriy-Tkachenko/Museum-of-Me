"use client";
import { useState } from "react";
import { PublicExhibitForm } from "@/components/public-exhibit-form";
import { MemoryUniverse } from "@/components/memory-universe";
import { InteriorIntro } from "@/components/scrapbook-ui";
export function GuestExperience({ token, personName, analyticsId, pexelsEnabled }: { token: string; personName: string; analyticsId?: string; pexelsEnabled: boolean }) {
 const [submitted, setSubmitted] = useState(false);
 return <div className={submitted ? "submission-wrap" : "scrapbook-workspace guest-workspace"}>
 {!submitted && <div><InteriorIntro eyebrow="You see something only you can see" title={<>A little thing.<br /><em>A lot of <span translate="no">{personName}</span>.</em></>} description={<>What reminds you of <span translate="no">{personName}</span>? An object, a place, a tiny detail. Give it a place in their museum.</>} /><div className="interior-visual"><MemoryUniverse compact name={personName} hidden interactive={false} /></div></div>}
 <section className={submitted ? "" : "form-panel paper-form guest-form"} aria-label={submitted ? "Memory added" : `Add a memory for ${personName}`}><PublicExhibitForm token={token} personName={personName} analyticsId={analyticsId} pexelsEnabled={pexelsEnabled} onSubmitted={() => setSubmitted(true)} /></section></div>;
}
