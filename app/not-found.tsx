import Link from "next/link";
import { PageShell } from "@/components/page-shell";
export default function NotFound() { return <PageShell><section className="mx-auto flex min-h-[65svh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center"><span className="mb-9 text-5xl text-accent/60" aria-hidden="true">✧</span><p className="eyebrow">Room not found</p><h1 className="display mt-6 text-6xl">A different door,<br /><em className="gold-text">perhaps.</em></h1><p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">This little corner doesn’t exist. Let’s find your way back to the things that do.</p><Link className="primary-link mt-8" href="/">Back to Museum of Me ↗</Link></section></PageShell>; }

