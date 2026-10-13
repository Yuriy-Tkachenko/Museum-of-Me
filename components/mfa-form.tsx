"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Mode = "loading" | "enroll" | "challenge";

function qrSource(value: string) {
  return value.startsWith("data:") ? value : `data:image/svg+xml;utf-8,${encodeURIComponent(value)}`;
}

export function MfaForm({ nextPath }: { nextPath: string }) {
  const started = useRef(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const { data: aal, error: aalError } = await supabaseBrowser.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) throw aalError;
        if (aal.currentLevel === "aal2") {
          window.location.replace(nextPath);
          return;
        }

        const { data: factors, error: factorsError } = await supabaseBrowser.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const verified = factors.totp[0];
        if (verified) {
          setFactorId(verified.id);
          setMode("challenge");
          return;
        }

        for (const factor of factors.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) {
          await supabaseBrowser.auth.mfa.unenroll({ factorId: factor.id });
        }
        const { data: enrollment, error: enrollmentError } = await supabaseBrowser.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Google Authenticator",
          issuer: "Museum of Me",
        });
        if (enrollmentError) throw enrollmentError;
        setFactorId(enrollment.id);
        setQr(qrSource(enrollment.totp.qr_code));
        setSecret(enrollment.totp.secret);
        setMode("enroll");
      } catch (setupError) {
        setError(setupError instanceof Error ? setupError.message : "Authenticator setup is unavailable. Please try again.");
      }
    })();
  }, [nextPath]);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !factorId) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabaseBrowser.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      window.location.assign(nextPath);
    } catch {
      setError("The code is incorrect or has expired. Enter the current six-digit code.");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await supabaseBrowser.auth.signOut();
    window.location.assign("/auth");
  }

  return <div className="mt-8 space-y-5">
    {mode === "loading" && !error && <p role="status" className="text-sm text-muted">Preparing secure sign-in…</p>}
    {mode === "enroll" && <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">Open Google Authenticator, tap <strong>+</strong>, scan this QR code, then enter the six-digit code.</p>
      {/* Supabase returns this QR as an SVG data URL. A native image can render it
          directly; next/image rejects some valid, dynamically generated SVG URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {qr && <img src={qr} alt="QR code for Google Authenticator" width={224} height={224} className="mx-auto aspect-square w-56 rounded-2xl bg-white p-3" />}
      <details className="text-xs text-muted"><summary className="cursor-pointer underline underline-offset-4">Can’t scan the QR code?</summary><p className="mt-3 break-all rounded-xl bg-ink/5 p-3 font-mono text-ink">{secret}</p></details>
    </div>}
    {(mode === "enroll" || mode === "challenge") && <form onSubmit={verify} className="space-y-5">
      {mode === "challenge" && <p className="text-sm leading-relaxed text-muted">Enter the current six-digit code from Google Authenticator.</p>}
      <label className="block text-xs text-muted">Authenticator code<input autoFocus inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" disabled={busy} className="mt-2 h-14 w-full rounded-2xl border border-ink/20 bg-transparent px-4 text-center text-xl tracking-[.4em] text-ink" /></label>
      <Button className="w-full" size="lg" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : mode === "enroll" ? "Enable and continue ↗" : "Confirm and continue ↗"}</Button>
    </form>}
    {error && <p role="alert" className="rounded-xl bg-red-100 p-4 text-sm text-red-800">{error}</p>}
    <button type="button" onClick={signOut} disabled={busy} className="min-h-11 w-full text-xs text-muted underline underline-offset-4">Use another Google account</button>
  </div>;
}
