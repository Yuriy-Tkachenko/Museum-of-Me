"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Mode = "loading" | "enroll" | "challenge";
const qrSource = (value: string) => value.startsWith("data:") ? value : `data:image/svg+xml;utf-8,${encodeURIComponent(value)}`;

export function AdminMfaForm({ adminEmail }: { adminEmail: string }) {
  const started = useRef(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    const response = await fetch("/api/admin/login", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Не удалось открыть панель.");
    window.location.assign("/admin");
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const { data: aal, error: aalError } = await supabaseBrowser.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) throw aalError;
        if (aal.currentLevel === "aal2") { await finish(); return; }
        const { data: factors, error: factorsError } = await supabaseBrowser.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const verified = factors.totp[0];
        if (verified) { setFactorId(verified.id); setMode("challenge"); return; }
        for (const factor of factors.all.filter(item => item.factor_type === "totp" && item.status === "unverified")) {
          await supabaseBrowser.auth.mfa.unenroll({ factorId: factor.id });
        }
        const { data: enrollment, error: enrollmentError } = await supabaseBrowser.auth.mfa.enroll({
          factorType: "totp", friendlyName: "Museum of Me Admin", issuer: "Museum of Me",
        });
        if (enrollmentError) throw enrollmentError;
        setFactorId(enrollment.id); setQr(qrSource(enrollment.totp.qr_code)); setSecret(enrollment.totp.secret); setMode("enroll");
      } catch (setupError) { setError(setupError instanceof Error ? setupError.message : "Не удалось подготовить Authenticator."); }
    })();
  }, []);

  async function verify(event: React.FormEvent) {
    event.preventDefault(); if (busy || !factorId) return;
    setBusy(true); setError("");
    try {
      const { error } = await supabaseBrowser.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      await finish();
    } catch { setError("Код неверен или устарел. Проверьте время на телефоне и введите новый код."); setBusy(false); }
  }

  async function signOut() { setBusy(true); await supabaseBrowser.auth.signOut(); window.location.assign("/admin/login"); }

  return <div className="admin-login-form">
    <p className="admin-account-note">Google-аккаунт подтверждён: <strong>{adminEmail}</strong></p>
    {mode === "loading" && !error && <p role="status" className="admin-account-note">Проверяем Authenticator…</p>}
    {mode === "enroll" && <div className="admin-mfa-setup"><p>Добавьте отдельную запись для панели: откройте Google Authenticator, нажмите <strong>+</strong> и отсканируйте QR-код.</p>{qr && <img src={qr} alt="QR-код для Google Authenticator" width={224} height={224} />}<details><summary>Ввести ключ вручную</summary><code>{secret}</code></details></div>}
    {(mode === "enroll" || mode === "challenge") && <form onSubmit={verify}>
      {mode === "challenge" && <p className="admin-account-note">Введите код из записи Museum of Me, связанной с этим аккаунтом.</p>}
      <label>Код Google Authenticator<input autoFocus inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} disabled={busy} /></label>
      <button type="submit" disabled={busy || code.length !== 6}>{busy ? "Проверяем…" : mode === "enroll" ? "Подключить и войти" : "Войти в панель"}<span aria-hidden="true">↗</span></button>
    </form>}
    {error && <p role="alert" className="admin-error">{error}</p>}
    <button type="button" className="admin-switch-account" onClick={signOut} disabled={busy}>Использовать другой Google-аккаунт</button>
  </div>;
}
