"use client";
import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { track, creationSource } from "@/lib/analytics";

export function AuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const pending = useRef(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setLoading(true); setError(""); setMessage("");
    try {
      if (sent) {
        const { data, error } = await supabaseBrowser.auth.verifyOtp({ email, token: code, type: "email" });
        if (error) throw error;
        if (data.user && Math.abs(Date.parse(data.user.last_sign_in_at ?? "") - Date.parse(data.user.created_at)) < 60000) track("signup_completed", { source: creationSource() }, "session");
        window.location.assign("/dashboard");
      } else {
        const { error } = await supabaseBrowser.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
        if (error) throw error;
        setSent(true); setMessage("Check your email. Open the link in this browser or enter the code below.");
      }
    } catch (error) { setError(error instanceof Error ? error.message : "We couldn’t sign you in. Please try again."); }
    finally { pending.current = false; setLoading(false); }
  }
  async function signInWithGoogle() {
    setLoading(true); setError("");
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
      if (error) throw error;
    } catch { setError("Google sign-in is unavailable. Please use email."); setLoading(false); }
  }
  return <div className="mt-9 space-y-5">
    {!configured && <p role="alert" className="rounded-xl bg-ink/5 p-4 text-sm text-muted">Sign-in is not available yet. Please try again later.</p>}
    <form onSubmit={submit} aria-busy={loading} className="space-y-5"><label className="block text-xs text-muted">Email address<input type="email" autoComplete="email" autoCapitalize="none" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={sent || loading || !configured} className="mt-2 h-14 w-full rounded-2xl border border-ink/20 bg-transparent px-4 text-base text-ink disabled:opacity-60" /></label>
    {sent && <label className="block text-xs text-muted">Email verification code<input autoFocus inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={8} pattern="[0-9]{6,8}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="Your email code" className="mt-2 h-14 w-full rounded-2xl border border-ink/20 bg-transparent px-4 text-base tracking-widest text-ink" /></label>}
    <Button className="w-full" size="lg" type="submit" disabled={loading || !configured}>{loading ? "One moment…" : sent ? "Verify code ↗" : "Continue with email ↗"}</Button></form>
    {sent && <button type="button" disabled={loading} onClick={() => { setSent(false); setCode(""); setMessage(""); }} className="min-h-11 w-full text-xs text-muted underline underline-offset-4">Change email or request a new code</button>}
    {googleEnabled && <Button type="button" variant="outline" className="w-full" size="lg" onClick={signInWithGoogle} disabled={loading || !configured}>Continue with Google ↗</Button>}
    {message && <p role="status" className="text-center text-sm leading-relaxed text-muted">{message}</p>}{error && <p role="alert" className="rounded-xl bg-red-100 p-4 text-sm text-red-800">{error}</p>}
    <p className="text-center text-xs leading-relaxed text-muted">No password to remember. Your email is only used to sign in.</p>
  </div>;
}
