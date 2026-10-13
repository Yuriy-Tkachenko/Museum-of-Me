"use client";
import { useState } from "react";

export function AdminLogout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign("/admin/login");
    } catch { setBusy(false); setError("Не удалось выйти. Повторите попытку."); }
  }
  return <div><button className="admin-quiet-button" onClick={logout} disabled={busy}>{busy ? "Выходим…" : "Выйти"}</button>{error && <p role="alert" className="admin-error">{error}</p>}</div>;
}
