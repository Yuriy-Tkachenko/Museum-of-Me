"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
export function DashboardRefresh({ collecting }: { collecting: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  useEffect(() => {
    if (!collecting) return;
    const update = () => { if (document.visibilityState === "visible") startTransition(() => router.refresh()); };
    const timer = setInterval(update, 10000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [collecting, router]);
  return <button type="button" onClick={refresh} disabled={pending} className="mt-4 min-h-11 text-xs text-muted underline underline-offset-4">{pending ? "Checking…" : collecting ? "Updates automatically · Refresh now" : "Refresh collection"}</button>;
}
