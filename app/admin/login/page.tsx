import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { adminEmail, isAdmin, isAdminGoogleUser } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Вход администратора — Museum of Me", robots: { index: false, follow: false } };
export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  let user: User | null = null;
  try { ({ data: { user } } = await (await createSupabaseServerClient()).auth.getUser()); } catch { /* Google configuration is checked by the client action. */ }
  const email = adminEmail();
  const authenticated = isAdminGoogleUser(user);
  return <main lang="ru" translate="no" className="admin-shell admin-login-shell"><div className="admin-login-card">
    <Link href="/" className="admin-brand"><span aria-hidden="true">✳</span> Museum of Me</Link>
    <p className="admin-eyebrow">Закрытая панель</p><h1>Вход администратора</h1>
    <p className="admin-muted">Сначала подтвердите аккаунт Google, затем введите текущий шестизначный код Google Authenticator.</p><AdminLoginForm authenticated={authenticated} wrongAccount={Boolean(user && !authenticated)} adminEmail={email} />
    <p className="admin-footnote">Пароль вводится только на защищённой странице Google и никогда не передаётся Museum of Me.</p>
  </div></main>;
}
