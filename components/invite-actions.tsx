"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyText, cancelledShare } from "@/lib/sharing";
import { track } from "@/lib/analytics";

export function InviteActions({ url, museumName, analyticsId }: { url: string; museumName: string; analyticsId?: string }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  async function copyLink() {
    setError("");
    try { await copyText(url); setCopied(true); track("invite_copied", { museum: analyticsId, method: "copy" }); }
    catch (error) { setError(error instanceof Error ? error.message : "Please copy the link manually."); }
  }
  async function shareLink() {
    if (!navigator.share) return copyLink();
    setSharing(true); setError("");
    try { await navigator.share({ title: museumName, text: "Add one memory to my museum.", url }); }
    catch (error) { if (!cancelledShare(error)) setError("Sharing is unavailable. You can copy the invitation instead."); }
    finally { setSharing(false); }
  }
  return <div className="mt-7 space-y-4"><label className="block"><span className="mb-2 block text-xs text-muted">Your private invitation</span><input aria-label="Invitation link" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-3 text-sm" /></label><div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="lime" onClick={copyLink}>{copied ? "Link copied ✓" : "Copy invite link"}</Button><Button type="button" variant="outline" onClick={shareLink} disabled={sharing}>{sharing ? "Sharing…" : "Send invitation ↗"}</Button></div><p role="status" className="text-xs leading-relaxed text-muted">{copied ? "Ready to paste into a message to your friends." : "Send this link to a few people who know you well."}</p>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}</div>;
}
