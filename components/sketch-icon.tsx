export function SketchIcon({ kind, className = "" }: { kind: "crown" | "create" | "invite" | "portrait" | "lock"; className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "crown" && <><path d="m8 48-3-30 17 13 9-24 11 24 17-18-6 36Z" /><path d="m10 55 43-3" /></>}
    {kind === "create" && <><path d="m10 10 35-4 4 45-34 6Z" /><path d="m20 23 15-2M22 34l10-1m5 18 14-22 6 4-14 21-8 4Z" /></>}
    {kind === "invite" && <><path d="M5 27 57 7 39 58l-9-23Z" /><path d="m30 35 18-18M21 43l-9 12" /></>}
    {kind === "portrait" && <><path d="m10 10 40-5 6 48-39 6Z" /><path d="m17 16 27-3 4 34-26 4Z" /><ellipse cx="32" cy="27" rx="5" ry="6" /><path d="M25 43q0-16 15-2" /></>}
    {kind === "lock" && <><path d="m17 29 30-3 3 25-30 4Z" /><path d="M22 28V17c0-16 20-15 20-2v12M33 37v7" /></>}
  </svg>;
}
