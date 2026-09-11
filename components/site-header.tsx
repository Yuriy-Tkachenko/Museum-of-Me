"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const [locale, setLocale] = useState<"en" | "ru">("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("museum-locale");
    if (saved === "ru" || saved === "en") setLocale(saved);
    const onLocaleChange = (event: Event) => setLocale((event as CustomEvent<"en" | "ru">).detail);
    window.addEventListener("museum-locale-change", onLocaleChange);
    return () => window.removeEventListener("museum-locale-change", onLocaleChange);
  }, []);

  const copy = locale === "ru"
    ? { create: "Создать", explore: "Смотреть", login: "Войти" }
    : { create: "Create", explore: "Explore", login: "Log in" };

  return <header className={`relative z-20 flex items-center justify-between px-5 py-5 md:px-10 md:py-7 ${dark ? "text-paper" : "text-ink"}`}>
    <Link href="/" className="display text-[25px] leading-none">Museum <span className="italic">of</span> Me</Link>
    <nav className="hidden items-center gap-8 text-xs uppercase tracking-[.18em] md:flex">
      <Link href="/create" className="opacity-70 transition-opacity hover:opacity-100">{copy.create}</Link>
      <Link href="/museum/mila" className="opacity-70 transition-opacity hover:opacity-100">{copy.explore}</Link>
    </nav>
    <div className="flex items-center gap-3 md:gap-5">
      <LanguageToggle dark={dark} />
      <Link href="/auth" className="text-xs uppercase tracking-[.16em] underline decoration-1 underline-offset-4">{copy.login}</Link>
    </div>
  </header>;
}
