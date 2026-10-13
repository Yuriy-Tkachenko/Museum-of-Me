import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import { AdminLogout } from "@/components/admin-logout";

export const metadata = { title: "Администратор — Museum of Me", robots: { index: false, follow: false } };
const number = new Intl.NumberFormat("ru-RU");
const date = (value: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "—";
const percent = (value: number, total: number) => total ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value / total * 100) + "%" : "0%";
const meterWidth = (value: number, total: number) => `${total ? Math.min(100, value / total * 100) : 0}%`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  if (!await isAdmin()) redirect("/admin/login");
  const params = await searchParams;
  const analytics = params.tab === "analytics";
  const { users, museums, metrics } = await loadAdminData(analytics);
  const query = (params.q ?? "").slice(0, 200).trim().toLowerCase();
  const filtered = users.filter(user => !query || [user.email, user.username, user.name, ...user.museums.map(museum => museum.slug)].some(value => value.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(pages, Math.max(1, Number.parseInt(params.page ?? "1") || 1));
  const visible = filtered.slice((currentPage - 1) * 50, currentPage * 50);
  return <main lang="ru" translate="no" className="admin-shell"><div className="admin-container">
    <header className="admin-header"><Link href="/" className="admin-brand"><span aria-hidden="true">✳</span> Museum of Me</Link><div className="admin-header-actions"><span>Панель администратора</span><AdminLogout /></div></header>
    <div className="admin-intro"><p className="admin-eyebrow">Обзор проекта</p><h1>{analytics ? "Как растут музеи" : "Люди и их музеи"}</h1><p className="admin-muted">{analytics ? "От первого ответа до новых коллекций, созданных вашими участниками." : "Все аккаунты проекта, включая тех, кто ещё не создал свой музей."}</p></div>
    <nav className="admin-tabs" aria-label="Разделы панели"><Link href="/admin" aria-current={!analytics ? "page" : undefined}>Пользователи <span>{number.format(users.length)}</span></Link><Link href="/admin?tab=analytics" aria-current={analytics ? "page" : undefined}>Аналитика</Link></nav>
    {!analytics ? <>
      <div className="admin-summary"><span><strong>{number.format(users.length)}</strong> пользователей</span><span><strong>{number.format(museums.length)}</strong> музеев</span><Link href={`/admin?q=${encodeURIComponent(query)}&page=${currentPage}`} className="admin-refresh">Обновить данные ↻</Link></div>
      <form className="admin-search" action="/admin"><label htmlFor="admin-search">Поиск пользователя</label><div><input id="admin-search" name="q" defaultValue={params.q ?? ""} placeholder="Email, логин, имя или адрес музея" maxLength={200} /><button type="submit">Найти</button></div></form>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Пользователь</th><th>Email</th><th>Логин</th><th>Пароль</th><th>Музей</th><th>Регистрация</th></tr></thead><tbody>
        {visible.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>Последний вход: {date(user.lastSignIn)}</small></td><td>{user.email}</td><td className="admin-mono">{user.username}</td><td><span className="admin-password-note" title="Supabase хранит хеши паролей и не отдаёт пароль в открытом виде.">Не отображается</span></td><td>{user.museums.length ? user.museums.map(museum => <div key={museum.id} className="admin-museum-link"><Link href={`/museum/${museum.slug}`} target="_blank" rel="noopener noreferrer">{museum.title} ↗</Link><small>/museum/{museum.slug} · {museum.collected_exhibits}/{museum.required_exhibits} · {museum.status === "unlocked" ? "Открыт" : "Собирается"}</small></div>) : <span className="admin-muted">Ещё не создан</span>}</td><td>{date(user.createdAt)}</td></tr>)}
        {!visible.length && <tr><td colSpan={6} className="admin-empty">Пользователи не найдены. Измените поисковый запрос.</td></tr>}
      </tbody></table></div>
      <div className="admin-pagination"><span>Найдено: {number.format(filtered.length)} · Страница {currentPage} из {pages}</span><div>{currentPage > 1 && <Link href={`/admin?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}>← Назад</Link>}{currentPage < pages && <Link href={`/admin?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}>Далее →</Link>}</div></div>
      <p className="admin-footnote">Пароли пользователей недоступны для просмотра: Supabase хранит их в виде хешей. Вход по коду из письма не требует постоянного пароля.</p>
    </> : metrics && <>
      <div className="admin-summary"><span><strong>{number.format(metrics.total)}</strong> музеев создано</span><span><strong>{number.format(metrics.replies)}</strong> экспонатов добавлено</span><Link href="/admin?tab=analytics" className="admin-refresh">Обновить данные ↻</Link></div>
      <section className="admin-metrics" aria-label="Основные показатели">
        <article><span>Получили хотя бы один ответ</span><strong>{number.format(metrics.museumsWithReplies)}<small> / {number.format(metrics.total)}</small></strong><p>{percent(metrics.museumsWithReplies, metrics.total)} созданных музеев начали наполняться</p><div className="admin-meter"><i style={{ width: meterWidth(metrics.museumsWithReplies, metrics.total) }} /></div></article>
        <article><span>Участники нажали «Создать свой музей»</span><strong>{number.format(metrics.participantsClicked)}</strong><p>После успешного добавления экспоната. Повторные нажатия не увеличивают число участников.</p></article>
        <article><span>Новых музеев на один существующий</span><strong>{new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(metrics.total ? metrics.born / metrics.total : 0)}</strong><p>{number.format(metrics.born)} новых музеев по переходам из {number.format(metrics.parents)} исходных коллекций</p></article>
        <article><span>Полностью открылись</span><strong>{number.format(metrics.opened)}</strong><p>{percent(metrics.opened, metrics.total)} музеев достигли выбранного числа экспонатов</p><div className="admin-meter"><i style={{ width: meterWidth(metrics.opened, metrics.total) }} /></div></article>
      </section>
      <div className="admin-measurement-note"><strong>Что входит в показатели</strong><p>Музеи с ответами и открытые музеи учитываются за всё время. Учёт кликов и связей между музеями начался {date(metrics.startedAt)}; прошлые переходы восстановить нельзя. Участник определяется по браузеру. Новый музей связывается с последним переходом из другого музея в течение 30 дней в том же браузере. Среднее — число таких новых музеев, делённое на общее число текущих музеев. Закрытие страницы или ошибка сети могут привести к пропуску события.</p></div>
      <div className="admin-section-heading"><h2>Рост из каждого музея</h2><p>Переходы участников и новые коллекции, созданные из этой истории.</p></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Исходный музей</th><th>Владелец</th><th>Ответы</th><th>Нажали «Создать»</th><th>Новых музеев</th><th>Статус</th></tr></thead><tbody>
        {metrics.byMuseum.map(museum => <tr key={museum.id}><td><Link className="admin-link" href={`/museum/${museum.slug}`} target="_blank" rel="noopener noreferrer">{museum.title} ↗</Link><small>/museum/{museum.slug}</small></td><td className="admin-mono">{museum.owner}</td><td>{museum.collected_exhibits} / {museum.required_exhibits}</td><td>{museum.clicks}</td><td><strong>{museum.children}</strong></td><td><span className={`admin-status ${museum.status === "unlocked" ? "is-open" : ""}`}>{museum.status === "unlocked" ? "Открыт" : "Собирается"}</span></td></tr>)}
        {!metrics.byMuseum.length && <tr><td colSpan={6} className="admin-empty">Первый музей ещё не создан.</td></tr>}
      </tbody></table></div>
    </>}
    <footer className="admin-footer">Museum of Me · Данные загружаются из Supabase при открытии страницы</footer>
  </div></main>;
}
