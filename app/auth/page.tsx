import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function AuthPage() { return <PageShell><section className="mx-auto flex min-h-[calc(100vh-90px)] max-w-md flex-col justify-center px-5 pb-12"><p className="mb-7 text-[10px] uppercase tracking-[.25em] text-muted">Welcome back</p><h1 className="display text-6xl leading-[.9]">Enter your<br /><span className="italic">museum.</span></h1><form action="/dashboard" className="mt-12 space-y-5"><input type="email" required placeholder="Email address" className="h-14 w-full rounded-full border border-ink/15 bg-transparent px-5 text-sm outline-none focus:border-ink" /><Button className="w-full" size="lg" type="submit">Continue <span>↗</span></Button></form><p className="mt-8 text-center text-xs text-muted">New here? <Link className="text-ink underline underline-offset-4" href="/create">Create a museum</Link></p></section></PageShell>; }
