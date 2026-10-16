import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { GuestExperience } from "@/components/guest-experience";
import { StatusScene } from "@/components/scrapbook-ui";
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
  return <PageShell><section className="interior-page">{!invite.exists || invite.expired ? <StatusScene eyebrow="Invitation unavailable" title={<>This room<br /><em>is closed.</em></>} description="This invitation may have expired. Ask your friend for their latest invitation link." symbol="×" /> : invite.closed ? <StatusScene eyebrow="Museum unlocked" title={<>The doors<br /><em>are open.</em></>} description="This museum has all its memories. Ask your friend to share the finished gallery with you." actionHref="/create" actionLabel="Start your own collection" symbol="♡" /> : <GuestExperience token={token} personName={invite.name} analyticsId={"analyticsId" in invite ? invite.analyticsId : undefined} pexelsEnabled={Boolean(process.env.PEXELS_API_KEY)} />}</section></PageShell>;
}
