import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicImageUrl } from "@/lib/media";
import { invitePattern, rateLimit } from "@/lib/security";
import { exhibits as mockExhibits, museum as mockMuseum } from "@/lib/mock-data";

export type PublicExhibit = { id: string; title: string; caption: string; imageUrl: string | null; symbol: string; color: string };
export type PublicMuseum = { analyticsId?: string; exists: boolean; unlocked: boolean; name: string; slug: string; title: string; exhibits: PublicExhibit[] };

const colors = ["#d9e9d2", "#f1cbb8", "#c7d5ee", "#e8d6a8"];
const symbols = ["✳", "◒", "▣", "✺", "⌁", "◉"];

export async function getPublicMuseum(slug: string): Promise<PublicMuseum> {
  const empty: PublicMuseum = { exists: false, unlocked: false, name: "", slug, title: "", exhibits: [] };
  if (!/^[a-z0-9_-]{1,64}$/.test(slug)) return empty;
  const fallback: PublicMuseum = { exists: slug === mockMuseum.slug, unlocked: slug === mockMuseum.slug, name: "Mila", slug, title: mockMuseum.name, exhibits: mockExhibits.map((exhibit) => ({ id: exhibit.id, title: exhibit.title, caption: exhibit.note, imageUrl: null, symbol: exhibit.symbol, color: exhibit.color })) };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.NODE_ENV === "development" ? fallback : empty;
  try {
    const supabase = createSupabaseAdminClient();
    const { data: museum } = await supabase.from("museums").select("id, slug, title, status, owner_id, analytics_id").eq("slug", slug).maybeSingle();
    if (!museum) return { exists: false, unlocked: false, name: "", slug, title: "", exhibits: [] };
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", museum.owner_id).maybeSingle();
    const name = profile?.display_name ?? museum.title;
    if (museum.status !== "unlocked") return { analyticsId: museum.analytics_id, exists: true, unlocked: false, name, slug: museum.slug, title: museum.title, exhibits: [] };
    const { data: rows } = await supabase.from("exhibits").select("id, title, caption, image_url").eq("museum_id", museum.id).order("created_at", { ascending: true });
    return { analyticsId: museum.analytics_id, exists: true, unlocked: true, name, slug: museum.slug, title: museum.title, exhibits: await Promise.all((rows ?? []).map(async (exhibit, index) => ({ id: exhibit.id, title: exhibit.title, caption: exhibit.caption ?? "A memory chosen with care.", imageUrl: await publicImageUrl(exhibit.image_url, museum.id), symbol: symbols[index % symbols.length] ?? "✳", color: colors[index % colors.length] ?? colors[0] }))) };
  } catch {
    return empty;
  }
}

export async function getInvitePreview(token: string) {
  if (!invitePattern.test(token)) return { exists: false, expired: false, closed: false, name: "" };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return token === mockMuseum.token ? { exists: true, expired: false, closed: false, name: "Mila" } : { exists: false, expired: false, closed: false, name: "" };
  try {
    await rateLimit("invite-reads-global", "all", 1000, 60);
    const supabase = createSupabaseAdminClient();
    const { data: invite } = await supabase.from("invite_links").select("museum_id, expires_at").eq("token", token).maybeSingle();
    if (!invite) return { exists: false, expired: false, closed: false, name: "" };
    const expired = Boolean(invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now());
    if (expired) return { exists: false, expired: true, closed: false, name: "" };
    const { data: museum } = await supabase.from("museums").select("title, status, owner_id, analytics_id").eq("id", invite.museum_id).maybeSingle();
    if (!museum) return { exists: false, expired, closed: false, name: "" };
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", museum.owner_id).maybeSingle();
    return { analyticsId: museum.analytics_id as string, exists: true, expired, closed: museum.status === "unlocked", name: profile?.display_name ?? museum.title };
  } catch {
    return { exists: false, expired: false, closed: false, name: "" };
  }
}
