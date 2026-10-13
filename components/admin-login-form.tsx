"use client";
import { useState } from "react";

export function AdminLoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось войти. Попробуйте ещё раз.");
      window.location.assign("/admin");
    } catch (error) { setError(error instanceof Error ? error.message : "Не удалось войти."); setLoading(false); }
  }
  return <form onSubmit={submit} className="admin-login-form" aria-busy={loading}>
    <label>Логин администратора<input autoComplete="username" required maxLength={100} value={login} onChange={event => setLogin(event.target.value)} disabled={loading} /></label>
    <label>Пароль<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} disabled={loading} /></label>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <button type="submit" disabled={loading}>{loading ? "Входим…" : "Войти в панель"}<span aria-hidden="true">↗</span></button>
  </form>;
}
