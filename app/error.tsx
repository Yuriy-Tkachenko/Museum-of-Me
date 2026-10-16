"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import { StatusScene } from "@/components/scrapbook-ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <PageShell><StatusScene eyebrow="A little pause" title={<>This room needs<br /><em>a moment.</em></>} description="We couldn’t load the page. Please try again. Your saved memories are still there." symbol="◊">{process.env.NODE_ENV === "development" && <pre translate="no" className="status-debug">{error.message}{error.digest ? `\nDigest: ${error.digest}` : ""}</pre>}<button onClick={reset} className="primary-link">Try again <span aria-hidden="true">↗</span></button><Link href="/" className="quiet-link">Back home</Link></StatusScene></PageShell>;
}
