"use client";

import { useEffect, useState } from "react";

type Locale = "en" | "ru";

export function LanguageToggle() {
  const [locale, setLocale] = useState<Locale>("ru");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem("museum-locale"); } catch { /* optional preference */ }
    if (saved === "ru" || saved === "en") setLocale(saved);
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    try { window.localStorage.setItem("museum-locale", next); } catch { /* optional preference */ }
    document.cookie = `museum-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new CustomEvent("museum-locale-change", { detail: next }));
  }

  return (
    <div className="flex items-center gap-1" aria-label="Choose language">
      {(["ru", "en"] as Locale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => changeLocale(item)}
          className={`relative h-9 min-w-7 px-1 text-[9px] font-medium uppercase tracking-[.12em] transition-colors ${locale === item ? "text-accent" : "text-ink/40 hover:text-ink"}`}
          aria-pressed={locale === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
