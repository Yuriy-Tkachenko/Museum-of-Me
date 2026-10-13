"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { track, rememberSource, creationSource, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

export function TrackEvent({ event, museum, onceKey = "session" }: { event: AnalyticsEvent; museum?: string; onceKey?: string }) {
  useEffect(() => { track(event, { museum, ...(event === "create_started" || event === "signup_completed" ? { source: creationSource() } : {}) }, onceKey); }, [event, museum, onceKey]);
  return null;
}

export function CreateLink({ source, museum, className, children }: { source: NonNullable<AnalyticsProps["source"]>; museum?: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return <Link href="/create" className={className} onClick={event => {
    rememberSource(source);
    if (source === "exhibit" || source === "reveal") track("viral_cta_clicked", { source }, source);
    track("create_started", { source }, "session");
    if (museum && (source === "exhibit" || source === "reveal") && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      void fetch("/api/analytics/create-click", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ museum, source }), signal: AbortSignal.timeout(5000), keepalive: true,
      }).catch(() => {}).finally(() => router.push("/create"));
    }
  }}>{children}</Link>;
}
