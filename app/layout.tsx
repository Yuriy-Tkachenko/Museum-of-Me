import type { Metadata } from "next";
import "./globals.css";
import { LocaleRuntime } from "@/components/locale-runtime";

export const metadata: Metadata = { title: "Museum of Me", description: "A personal museum made by the people who know you best." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><LocaleRuntime />{children}</body></html>; }
