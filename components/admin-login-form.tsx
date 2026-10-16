"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AdminMfaForm } from "@/components/admin-mfa-form";

export function AdminLoginForm({ authenticated, wrongAccount, adminEmail }: { authenticated: boolean; wrongAccount: boolean; adminEmail: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function googleSignIn() {
    setLoading(true); setError("");
    try {
      if (wrongAccount) await supabaseBrowser.auth.signOut();
      const { error } = await supabaseBrowser.auth.signInWithOAuth({ provider: "google", options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`, queryParams: { prompt: "select_account" },
      } });
      if (error) throw error;
    } catch { setError("Не удалось начать вход через Google. Попробуйте ещё раз."); setLoading(false); }
  }

  if (!authenticated) return <div className="admin-login-form">
    {wrongAccount && <p role="alert" className="admin-error">Этот Google-аккаунт не имеет доступа к панели.</p>}
    <p className="admin-account-note">Разрешённый аккаунт: <strong>{adminEmail}</strong></p>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <button type="button" onClick={googleSignIn} disabled={loading}>{loading ? "Переходим в Google…" : "Продолжить через Google"}<span aria-hidden="true">↗</span></button>
  </div>;

  return <AdminMfaForm adminEmail={adminEmail} />;
}
