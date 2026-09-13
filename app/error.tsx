"use client";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
export default function ErrorPage({ reset }: { reset: () => void }) { return <PageShell><section className="mx-auto flex min-h-[65svh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center"><span className="mb-9 text-5xl text-accent/60" aria-hidden="true">◌</span><p className="eyebrow">A little pause</p><h1 className="display mt-6 text-6xl">This room needs<br /><em className="gold-text">a moment.</em></h1><p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">We couldn’t load the page. Please try again. Your saved memories are still there.</p><button onClick={reset} className="primary-link mt-8">Try again ↗</button><Link href="/" className="quiet-link mt-4">Back home</Link></section></PageShell>; }

