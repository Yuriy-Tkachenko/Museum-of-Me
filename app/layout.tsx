import type { Metadata } from "next";
import "./globals.css";
import { LocaleRuntime } from "@/components/locale-runtime";
import { MotionProvider } from "@/components/motion-provider";

export const metadata: Metadata = { title: "Museum of Me", description: "A personal museum made by the people who know you best." };
// Request-specific CSP nonces must also be present in the generated HTML.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><a className="skip-link" href="#content">Skip to content</a><LocaleRuntime /><MotionProvider><div id="content">{children}</div></MotionProvider></body></html>; }
