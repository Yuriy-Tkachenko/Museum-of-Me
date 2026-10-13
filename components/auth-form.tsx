"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) throw error;
    } catch {
      setError("Google sign-in is unavailable. Please try again.");
      setLoading(false);
    }
  }

  return <div className="mt-9 space-y-5">
    {!configured && <p role="alert" className="rounded-xl bg-ink/5 p-4 text-sm text-muted">Sign-in is not available yet. Please try again later.</p>}
    <Button type="button" variant="outline" className="w-full" size="lg" onClick={signInWithGoogle} disabled={loading || !configured}>
      {loading ? "One moment…" : "Continue with Google ↗"}
    </Button>
    {error && <p role="alert" className="rounded-xl bg-red-100 p-4 text-sm text-red-800">{error}</p>}
    <p className="text-center text-xs leading-relaxed text-muted">After Google, confirm your sign-in with a code from Google Authenticator.</p>
  </div>;
}
