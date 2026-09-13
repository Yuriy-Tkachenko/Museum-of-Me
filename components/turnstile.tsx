"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; action: string; size: "compact" | "flexible"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

export function Turnstile({ onToken, resetKey }: { onToken: (token: string) => void; resetKey: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !container.current || !sitekey || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(container.current, {
      sitekey, action: "submit_exhibit", size: container.current.clientWidth < 300 ? "compact" : "flexible", callback: (token) => { setFailed(false); onToken(token); },
      "expired-callback": () => onToken(""), "error-callback": () => { setFailed(true); onToken(""); },
    });
    return () => { api.remove(id); };
  }, [ready, sitekey, onToken, resetKey]);
  if (!sitekey) return <p role="alert" className="mb-6 text-sm text-red-800">Submissions are temporarily unavailable.</p>;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => { setFailed(true); onToken(""); }} /><div ref={container} className="mb-6" />{failed && <p role="alert" className="mb-5 text-sm text-red-800">Verification could not load. Check your connection and allow Cloudflare verification, then reload this page.</p>}</>;
}
