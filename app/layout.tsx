import type { Metadata } from "next";
import "@fontsource-variable/onest";
import "@fontsource-variable/brygada-1918";
import "@fontsource-variable/brygada-1918/wght-italic.css";
import "@fontsource/rubik-dirt";
import "@fontsource/neucha";
import "@fontsource/permanent-marker";
import "@fontsource/caveat/700.css";
import "./globals.css";
import "./scrapbook.css";
import "./reference-landing.css";
import { LocaleRuntime } from "@/components/locale-runtime";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Museum of Me", template: "%s | Museum of Me" },
  description: "A personal museum made by the people who know you best.",
  openGraph: {
    type: "website",
    siteName: "Museum of Me",
    title: "Museum of Me",
    description: "A personal museum made by the people who know you best.",
  },
};
// Request-specific CSP nonces must also be present in the generated HTML.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><a className="skip-link" href="#content">Skip to content</a><LocaleRuntime /><div id="content">{children}</div></body></html>; }
