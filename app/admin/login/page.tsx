import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Вход администратора — Museum of Me", robots: { index: false, follow: false } };
export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <main lang="ru" translate="no" className="admin-shell admin-login-shell"><div className="admin-login-card">
    <Link href="/" className="admin-brand"><span aria-hidden="true">✳</span> Museum of Me</Link>
    <p className="admin-eyebrow">Закрытая панель</p><h1>Вход администратора</h1>
    <p className="admin-muted">Пользователи, музеи и рост проекта в одном месте.</p><AdminLoginForm />
    <p className="admin-footnote">Вход для управления проектом. Пользовательский аккаунт музея здесь не используется.</p>
  </div></main>;
}
