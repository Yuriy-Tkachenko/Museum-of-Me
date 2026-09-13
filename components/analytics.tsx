"use client";
import Link from "next/link";
import { useEffect } from "react";
import { track, rememberSource, creationSource, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

export function TrackEvent({ event, museum, onceKey = "session" }: { event: AnalyticsEvent; museum?: string; onceKey?: string }) {
  useEffect(() => { track(event, { museum, ...(event === "create_started" || event === "signup_completed" ? { source: creationSource() } : {}) }, onceKey); }, [event, museum, onceKey]);
  return null;
}

export function CreateLink({ source, className, children }: { source: NonNullable<AnalyticsProps["source"]>; className?: string; children: React.ReactNode }) {
  return <Link href="/create" className={className} onClick={() => {
    rememberSource(source);
    if (source === "exhibit" || source === "reveal") track("viral_cta_clicked", { source }, source);
    track("create_started", { source }, "session");
  }}>{children}</Link>;
}
