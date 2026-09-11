"use client";

import { useEffect, useState } from "react";

type Locale = "en" | "ru";

export function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("museum-locale");
    if (saved === "ru" || saved === "en") setLocale(saved);
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    window.localStorage.setItem("museum-locale", next);
    document.cookie = `museum-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new CustomEvent("museum-locale-change", { detail: next }));
  }

  return (
    <div className={`flex items-center rounded-full border p-0.5 ${dark ? "border-paper/20" : "border-ink/15"}`} aria-label="Choose language">
      {(["ru", "en"] as Locale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => changeLocale(item)}
          className={`relative h-7 min-w-8 rounded-full px-2 text-[9px] font-medium uppercase tracking-[.12em] transition-colors ${locale === item ? "bg-accent text-ink" : dark ? "text-paper/50 hover:text-paper" : "text-ink/45 hover:text-ink"}`}
          aria-pressed={locale === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
