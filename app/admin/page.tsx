import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import { AdminLogout } from "@/components/admin-logout";

export const metadata = { title: "Администратор — Museum of Me", robots: { index: false, follow: false } };
const number = new Intl.NumberFormat("ru-RU");
const decimal = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
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
    <div className="admin-intro"><p className="admin-eyebrow">Обзор проекта</p><h1>{analytics ? "Воронка и точки потери" : "Люди и их музеи"}</h1><p className="admin-muted">{analytics ? "От открытия приглашения до ответа, собственного музея и публикации готовой коллекции." : "Аккаунты, регистрационные данные и отклик на приглашения владельцев."}</p></div>
    <nav className="admin-tabs" aria-label="Разделы панели"><Link href="/admin" aria-current={!analytics ? "page" : undefined}>Пользователи <span>{number.format(users.length)}</span></Link><Link href="/admin?tab=analytics" aria-current={analytics ? "page" : undefined}>Аналитика</Link></nav>

    {!analytics ? <>
      <div className="admin-summary"><span><strong>{number.format(users.length)}</strong> пользователей</span><span><strong>{number.format(museums.length)}</strong> музеев</span><Link href={`/admin?q=${encodeURIComponent(query)}&page=${currentPage}`} className="admin-refresh">Обновить данные ↻</Link></div>
      <form className="admin-search" action="/admin"><label htmlFor="admin-search">Поиск пользователя</label><div><input id="admin-search" name="q" defaultValue={params.q ?? ""} placeholder="Email, логин, имя или адрес музея" maxLength={200} /><button type="submit">Найти</button></div></form>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Пользователь</th><th>Email</th><th>Логин</th><th>Музей</th><th>Открыли / ответили</th><th>Регистрация</th></tr></thead><tbody>
        {visible.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>Последний вход: {date(user.lastSignIn)}</small></td><td>{user.email}</td><td className="admin-mono">{user.username}</td><td>{user.museums.length ? user.museums.map(museum => <div key={museum.id} className="admin-museum-link"><Link href={`/museum/${museum.slug}`} target="_blank" rel="noopener noreferrer">{museum.title} ↗</Link><small>/museum/{museum.slug} · {museum.collected_exhibits}/{museum.required_exhibits} · {museum.status === "unlocked" ? "Открыт" : "Собирается"}</small></div>) : <span className="admin-muted">Ещё не создан</span>}</td><td>{user.museums.length ? user.museums.map(museum => <div key={museum.id} className="admin-museum-link"><strong>{number.format(museum.inviteOpens)} / {number.format(museum.contributors)}</strong><small>уникальных браузеров · начали форму: {number.format(museum.formStarts)}</small></div>) : "—"}</td><td>{date(user.createdAt)}</td></tr>)}
        {!visible.length && <tr><td colSpan={6} className="admin-empty">Пользователи не найдены. Измените поисковый запрос.</td></tr>}
      </tbody></table></div>
      <div className="admin-pagination"><span>Найдено: {number.format(filtered.length)} · Страница {currentPage} из {pages}</span><div>{currentPage > 1 && <Link href={`/admin?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}>← Назад</Link>}{currentPage < pages && <Link href={`/admin?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}>Далее →</Link>}</div></div>
      <p className="admin-footnote">«Открыли» — не число отправленных приглашений, а число уникальных браузеров, которые действительно перешли по ссылке. Проект не читает мессенджеры и не может узнать, кому владелец отправил ссылку. Пароли пользователей недоступны: Supabase хранит только их хеши.</p>
    </> : metrics && <>
      <div className="admin-summary"><span><strong>{number.format(users.length)}</strong> пользователей</span><span><strong>{number.format(metrics.total)}</strong> музеев</span><span><strong>{number.format(metrics.replies)}</strong> ответов</span><Link href="/admin?tab=analytics" className="admin-refresh">Обновить данные ↻</Link></div>

      <section className="admin-funnel" aria-label="Воронка ответов">
        <div><span>Открыли приглашение</span><strong>{number.format(metrics.inviteVisits)}</strong><small>{number.format(metrics.inviteOpeners)} уникальных людей</small></div><i aria-hidden="true">→</i>
        <div><span>Начали отвечать</span><strong>{number.format(metrics.formStartVisits)}</strong><small>{percent(metrics.formStartVisits, metrics.inviteVisits)} от открытий</small></div><i aria-hidden="true">→</i>
        <div><span>Отправили ответ</span><strong>{number.format(metrics.contributionVisits)}</strong><small>{percent(metrics.contributionVisits, metrics.inviteVisits)} от открытий</small></div>
      </section>

      <section className="admin-metrics" aria-label="Проблемные показатели">
        <article><span>Открыли ссылку, но не ответили</span><strong>{number.format(Math.max(0, metrics.inviteVisits - metrics.contributionVisits))}</strong><p>{percent(Math.max(0, metrics.inviteVisits - metrics.contributionVisits), metrics.inviteVisits)} открытий не завершились ответом</p><div className="admin-meter"><i style={{ width: meterWidth(Math.max(0, metrics.inviteVisits - metrics.contributionVisits), metrics.inviteVisits) }} /></div></article>
        <article><span>Музеи собрали меньше 3 ответов</span><strong>{number.format(metrics.fewerThanThree)}<small> / {number.format(metrics.total)}</small></strong><p>{number.format(metrics.stalled)} из них созданы 7 или более дней назад и всё ещё не открыты</p><div className="admin-meter"><i style={{ width: meterWidth(metrics.fewerThanThree, metrics.total) }} /></div></article>
        <article><span>Участники создали свой музей</span><strong>{number.format(metrics.born)}<small> / {number.format(metrics.measuredContributors)}</small></strong><p>{percent(metrics.born, metrics.measuredContributors)} contributors, ответивших с начала реферальных измерений; нажали CTA: {number.format(metrics.participantsClicked)}</p><div className="admin-meter"><i style={{ width: meterWidth(metrics.born, metrics.measuredContributors) }} /></div></article>
        <article><span>Готовые музеи начали шарить</span><strong>{number.format(metrics.sharedMuseums)}<small> / {number.format(metrics.opened)}</small></strong><p>{percent(metrics.sharedMuseums, metrics.opened)} открытых музеев; уникальных способов и форматов: {number.format(metrics.shareActions)}</p><div className="admin-meter"><i style={{ width: meterWidth(metrics.sharedMuseums, metrics.opened) }} /></div></article>
      </section>

      <section className="admin-secondary-metrics" aria-label="Суммарная статистика">
        <div><span>С ответами</span><strong>{number.format(metrics.museumsWithReplies)}</strong><small>{percent(metrics.museumsWithReplies, metrics.total)} музеев</small></div>
        <div><span>Полностью открылись</span><strong>{number.format(metrics.opened)}</strong><small>{percent(metrics.opened, metrics.total)} музеев</small></div>
        <div><span>Конверсия к ответу</span><strong>{percent(metrics.contributionVisits, metrics.inviteVisits)}</strong><small>ответы / открытия ссылок</small></div>
        <div><span>Виральный коэффициент</span><strong>{decimal.format(metrics.total ? metrics.born / metrics.total : 0)}</strong><small>дочерних музеев на музей</small></div>
      </section>

      <div className="admin-measurement-note"><strong>Как читать данные</strong><p>Ответы, аккаунты и статусы музеев берутся из PostgreSQL за всё время. Открытие ссылки, начало формы, просмотр галереи и шаринг — новые first-party события и начнут накапливаться только после публикации этой версии; исторические значения восстановить нельзя. Один человек определяется по подписанному ID браузера на 30 дней, поэтому другой браузер считается другим человеком. Реферальные клики и создание дочерних музеев учитываются с {date(metrics.startedAt)}. Сбои сети могут немного занижать события.</p></div>

      <div className="admin-section-heading"><h2>Диагностика каждого музея</h2><p>Где владелец теряет людей: до формы, до ответа, до собственного музея или до шаринга.</p></div>
      <div className="admin-table-wrap"><table className="admin-table admin-wide-table"><thead><tr><th>Музей</th><th>Владелец</th><th>Открыли ссылку</th><th>Начали форму</th><th>Ответили</th><th>Конверсия</th><th>Нажали «Создать»</th><th>Создали музей</th><th>Просмотры / шаринг</th><th>Статус</th></tr></thead><tbody>
        {metrics.byMuseum.map(museum => <tr key={museum.id}><td><Link className="admin-link" href={`/museum/${museum.slug}`} target="_blank" rel="noopener noreferrer">{museum.title} ↗</Link><small>/museum/{museum.slug} · создан {date(museum.created_at)}</small></td><td className="admin-mono">{museum.owner}</td><td><strong>{number.format(museum.inviteOpens)}</strong></td><td>{number.format(museum.formStarts)}</td><td>{number.format(museum.trackedContributors)}<small>всего: {number.format(museum.contributors)} · цель: {number.format(museum.required_exhibits)}</small></td><td>{percent(museum.trackedContributors, museum.inviteOpens)}</td><td>{number.format(museum.clicks)}</td><td><strong>{number.format(museum.children)}</strong></td><td>{number.format(museum.galleryViews)} / {number.format(museum.sharers)}<small>галерея / уникальные sharers</small></td><td><span className={`admin-status ${museum.status === "unlocked" ? "is-open" : ""}`}>{museum.status === "unlocked" ? "Открыт" : "Собирается"}</span></td></tr>)}
        {!metrics.byMuseum.length && <tr><td colSpan={10} className="admin-empty">Первый музей ещё не создан.</td></tr>}
      </tbody></table></div>
    </>}
    <footer className="admin-footer">Museum of Me · Данные загружаются из Supabase при открытии страницы</footer>
  </div></main>;
}
