import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { GuestExperience } from "@/components/guest-experience";
import { getInvitePreview } from "@/lib/public-museum";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const invite = await getInvitePreview(token);
  if (!invite.exists) return { title: "Museum invitation — Museum of Me", robots: { index: false, follow: false } };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { title: `${invite.name} creates a Museum of Me`, description: `Add one thing that reminds you of ${invite.name}`, robots: { index: false, follow: false }, openGraph: { title: `${invite.name} creates a Museum of Me`, description: `Add one thing that reminds you of ${invite.name}`, images: [`${base}/api/invites/${token}/preview`] } };
}
export default async function AddMemoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvitePreview(token);
  return <PageShell><section className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-10 md:pt-16">{!invite.exists || invite.expired ? <div className="mx-auto max-w-xl py-16 text-center"><p className="mb-6 text-[10px] uppercase tracking-[.25em] text-muted">Invitation unavailable</p><h1 className="display text-5xl leading-[.95] md:text-7xl">This room<br /><span className="italic gold-text">is closed.</span></h1><p className="mt-7 text-sm leading-relaxed text-muted">This invitation may have expired. Ask your friend for their latest invitation link.</p><Link href="/" className="mt-8 inline-flex min-h-11 items-center text-sm underline">Back home</Link></div> : invite.closed ? <div className="mx-auto max-w-xl py-16 text-center"><p className="mb-6 text-[10px] uppercase tracking-[.25em] text-muted">Museum unlocked</p><h1 className="display text-5xl leading-[.95] md:text-7xl">The doors<br /><span className="italic gold-text">are open.</span></h1><p className="mt-7 text-sm leading-relaxed text-muted">This museum has all its memories. Ask your friend to share the finished gallery with you.</p><Link href="/create" className="primary-link mt-8">Start your own collection ↗</Link></div> : <GuestExperience token={token} personName={invite.name} analyticsId={"analyticsId" in invite ? invite.analyticsId : undefined} pexelsEnabled={Boolean(process.env.PEXELS_API_KEY)} />}</section></PageShell>;
}
