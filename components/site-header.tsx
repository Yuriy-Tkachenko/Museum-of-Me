"use client";
import Link from "next/link";
import { SketchIcon } from "@/components/sketch-icon";
import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SiteHeader({ referenceBrand = false }: { referenceBrand?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let mounted = true;
    void supabaseBrowser.auth.getUser().then(({ data }) => { if (mounted) setSignedIn(Boolean(data.user)); }).catch(() => {});
    const { data } = supabaseBrowser.auth.onAuthStateChange((_event, session) => { if (mounted) setSignedIn(Boolean(session)); });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  async function signOut() {
    setBusy(true);
    try { const { error } = await supabaseBrowser.auth.signOut(); if (!error) window.location.assign("/"); } finally { setBusy(false); }
  }
  return <header className="site-header">
    <Link href="/" aria-label="Museum of Me home" className="brand">{referenceBrand ? <><SketchIcon kind="crown" /><span translate="no">Museum of Me</span></> : <><span className="brand-mark" aria-hidden="true">♕</span><span>Museum <i>of</i> Me</span></>}</Link>
    <nav aria-label="Main navigation" className="header-nav"><Link href="/#how-it-works" className="py-3">How it works</Link><Link href="/demo" className="py-3">A sample museum</Link>{signedIn && <button disabled={busy} onClick={signOut} className="py-3">{busy ? "Leaving…" : "Sign out"}</button>}</nav>
    <div className="header-actions"><LanguageToggle /><Link href={signedIn ? "/dashboard" : "/auth"} className="header-account">{signedIn ? "My museum" : "Log in"}</Link></div>
  </header>;
}
