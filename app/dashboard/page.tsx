import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { InviteActions } from "@/components/invite-actions";
import { DashboardRefresh } from "@/components/dashboard-refresh";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
import { MuseumSettingsForm } from "@/components/museum-settings-form";
import { portraitImageUrl } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
 if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/auth");
 const supabase = await createSupabaseServerClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/auth");
 const { data: museum, error } = await supabase.from("museums").select("id, title, slug, required_exhibits, collected_exhibits, status, analytics_id, portrait_path").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
 if (error) throw new Error("Could not load your collection.");
 if (!museum) redirect("/create");
 const { data: profile } = await supabase.from("profiles").select("display_name, username").eq("user_id", user.id).maybeSingle();
 const portraitUrl = await portraitImageUrl(museum.portrait_path, user.id);
 const collecting = museum.status === "collecting";
 const { data: invite } = await supabase.from("invite_links").select("token").eq("museum_id", museum.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
 const count = museum.collected_exhibits, target = museum.required_exhibits, remaining = Math.max(0, target - count);
 const inviteUrl = invite ? `${process.env.NEXT_PUBLIC_SITE_URL}/m/${invite.token}` : "";
 return <PageShell><section className="interior-page dashboard-page">
 <header className="dashboard-heading"><div className="min-w-0 flex-1"><p className="interior-kicker">Your own little universe</p><h1 translate="no">{museum.title}</h1><MuseumSettingsForm initialName={profile?.display_name ?? museum.title} initialUsername={profile?.username ?? museum.slug} initialTitle={museum.title} initialPortrait={portraitUrl} /></div><span role="status" className="dashboard-status"><span aria-hidden="true">✦ </span>{collecting ? "Collecting memories" : "Your museum is open"}</span></header>
 <div className="dashboard-layout"><aside className="form-panel dashboard-panel"><p className="interior-kicker">{collecting ? "The collection is taking shape" : "Made with love. Ready for you."}</p><div className="dashboard-count" aria-live="polite"><span data-testid="exhibit-count">{count}</span><small>/ {target} memories received</small></div>
 <div role="progressbar" aria-label="Museum collection progress" aria-valuemin={0} aria-valuemax={target} aria-valuenow={count} className="progress-track"><div style={{ width: `${Math.min(count / target * 100, 100)}%` }} /></div>
 <p className="mt-5 text-xs leading-relaxed text-muted">{collecting ? count === 0 ? "Your world is waiting to be filled. Send the first invitation and let your people surprise you." : `Just ${remaining} more ${remaining === 1 ? "memory" : "memories"} until the doors open. Every contribution is a surprise.` : "The waiting is over. A collection made by your people is ready for you."}</p>
 {collecting && inviteUrl ? <InviteActions url={inviteUrl} museumName={museum.title} analyticsId={museum.analytics_id} /> : !collecting ? <div className="mt-8 grid gap-3"><Link href={`/museum/${museum.slug}`} className="primary-link">Open your museum ↗</Link><Link href={`/museum/${museum.slug}/share`} className="quiet-link justify-center">Make a share poster ↗</Link></div> : <p role="alert" className="mt-8 text-sm text-red-300">Your invitation could not be loaded. Please refresh.</p>}
 <DashboardRefresh collecting={collecting} /><p className="mt-4 text-[11px] leading-relaxed text-muted">{collecting ? "Only the number of memories is visible. The stories appear together when the collection is complete." : "Your gallery is now public. Share the museum link or save your poster."}</p></aside>
 <div className="min-w-0"><HeroMemoryOrbit compact showPersonalEdit name={profile?.display_name ?? museum.title} portraitUrl={portraitUrl} hidden={collecting} memories={Array.from({ length: Math.min(count, 6) }, (_, i) => ({ id: String(i), title: `Memory ${i + 1}`, caption: "Ready to discover in your gallery.", imageUrl: null }))} interactive={false} /><div className="mt-6 border-t border-accent/15 pt-6"><p className="eyebrow">{collecting ? "A place for every little surprise" : "Every memory has a place"}</p><div className="memory-slots">{Array.from({ length: Math.min(target, 20) }, (_, i) => <div key={i} className={`memory-slot ${i < count ? "received" : ""}`}><span aria-hidden="true">{i < count ? "✦" : "◌"} </span>{i < count ? `Memory ${i + 1} received` : "Waiting for a friend"}</div>)}</div>{target > 20 && <p className="mt-4 text-xs text-muted">And {target - 20} more places in your collection.</p>}</div></div></div></section></PageShell>;
}
