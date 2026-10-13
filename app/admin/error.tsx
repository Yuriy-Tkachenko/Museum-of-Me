"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <main lang="ru" translate="no" className="admin-shell admin-login-shell"><div className="admin-login-card">
    <p className="admin-eyebrow">Панель администратора</p><h1>Не удалось загрузить данные</h1>
    <p className="admin-muted">Проверьте соединение с Supabase и повторите попытку.</p>
    <button className="admin-quiet-button mt-6" onClick={reset}>Попробовать ещё раз</button>
  </div></main>;
}
