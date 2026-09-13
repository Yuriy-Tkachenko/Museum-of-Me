"use client";
import { useState } from "react";
import { PublicExhibitForm } from "@/components/public-exhibit-form";
import { MemoryUniverse } from "@/components/memory-universe";
export function GuestExperience({ token, personName, analyticsId, pexelsEnabled }: { token: string; personName: string; analyticsId?: string; pexelsEnabled: boolean }) {
 const [submitted, setSubmitted] = useState(false);
 return <div className={submitted ? "mx-auto max-w-xl" : "grid items-start gap-9 md:grid-cols-2 md:gap-16"}>
 {!submitted && <div><p className="eyebrow mb-6">You see something only you can see</p><h1 className="display interior-heading">A little thing.<br /><em className="gold-text">A lot of <span translate="no">{personName}</span>.</em></h1><p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">What reminds you of <span translate="no">{personName}</span>? An object, a place, a tiny detail. Give it a place in their museum.</p><div className="interior-visual"><MemoryUniverse compact name={personName} hidden interactive={false} /></div></div>}
 <div className={submitted ? "" : "form-panel"}><PublicExhibitForm token={token} personName={personName} analyticsId={analyticsId} pexelsEnabled={pexelsEnabled} onSubmitted={() => setSubmitted(true)} /></div></div>;
}
