import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { adminAnalyticsBucket, listReferralEvents } from "@/lib/admin-analytics";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MuseumRow = { id: string; owner_id: string; slug: string; title: string; collected_exhibits: number; required_exhibits: number; status: string; created_at: string };
type ProfileRow = { user_id: string; username: string; display_name: string };
type AccountRow = { id: string; email: string; createdAt: string; lastSignIn: string | null };

async function allRows<T>(admin: SupabaseClient, table: string, fields: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from(table).select(fields).order("id").range(offset, offset + 999);
    if (error) throw new Error("Не удалось загрузить данные музеев.");
    rows.push(...data as unknown as T[]);
    if (data.length < 1000) return rows;
  }
}

async function allAccounts(admin: SupabaseClient) {
  const accounts: AccountRow[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Не удалось загрузить пользователей.");
    accounts.push(...data.users.map(user => ({ id: user.id, email: user.email ?? "—", createdAt: user.created_at, lastSignIn: user.last_sign_in_at ?? null })));
    if (data.users.length < 1000) return accounts;
  }
}

export async function loadAdminData(analytics: boolean) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const [accounts, profiles, museums] = await Promise.all([
    allAccounts(admin), allRows<ProfileRow>(admin, "profiles", "id,user_id,username,display_name"),
    allRows<MuseumRow>(admin, "museums", "id,owner_id,slug,title,collected_exhibits,required_exhibits,status,created_at"),
  ]);
  const profilesByUser = new Map(profiles.map(profile => [profile.user_id, profile]));
  const users = accounts.map(account => ({ ...account, username: profilesByUser.get(account.id)?.username ?? "—",
    name: profilesByUser.get(account.id)?.display_name ?? "Профиль ещё не создан",
    museums: museums.filter(museum => museum.owner_id === account.id) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!analytics) return { users, museums, metrics: null };
  const [clicks, births, started] = await Promise.all([
    listReferralEvents("clicks"), listReferralEvents("births"), admin.storage.from(adminAnalyticsBucket).download("measurement-start.json"),
  ]);
  if (started.error || !started.data) throw new Error("Учёт аналитики ещё не настроен.");
  const start = JSON.parse(await started.data.text()) as { startedAt: string };
  const ids = new Set(museums.map(museum => museum.id));
  const validClicks = clicks.filter(event => ids.has(event.parentId) && event.source === "exhibit" && event.visitor);
  const validBirths = births.filter(event => ids.has(event.parentId) && event.childId && ids.has(event.childId));
  const childrenByMuseum = new Map<string, Set<string>>();
  const clicksByMuseum = new Map<string, Set<string>>();
  validBirths.forEach(event => { const children = childrenByMuseum.get(event.parentId) ?? new Set<string>(); children.add(event.childId!); childrenByMuseum.set(event.parentId, children); });
  validClicks.forEach(event => { const participants = clicksByMuseum.get(event.parentId) ?? new Set<string>(); participants.add(event.visitor!); clicksByMuseum.set(event.parentId, participants); });
  const museumsWithReplies = museums.filter(museum => museum.collected_exhibits >= 1).length;
  const opened = museums.filter(museum => museum.status === "unlocked" && museum.collected_exhibits >= museum.required_exhibits).length;
  const born = new Set(validBirths.map(event => event.childId)).size;
  return { users, museums, metrics: {
    startedAt: start.startedAt, total: museums.length, museumsWithReplies, opened, born,
    participantsClicked: new Set(validClicks.map(event => event.visitor)).size,
    parents: childrenByMuseum.size, replies: museums.reduce((sum, museum) => sum + museum.collected_exhibits, 0),
    byMuseum: [...museums].sort((a, b) => (childrenByMuseum.get(b.id)?.size ?? 0) - (childrenByMuseum.get(a.id)?.size ?? 0) || b.created_at.localeCompare(a.created_at)).map(museum => ({ ...museum,
      owner: profilesByUser.get(museum.owner_id)?.username ?? "—", children: childrenByMuseum.get(museum.id)?.size ?? 0, clicks: clicksByMuseum.get(museum.id)?.size ?? 0,
    })),
  } };
}
