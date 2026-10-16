import { PageShell } from "@/components/page-shell";
import { StatusScene } from "@/components/scrapbook-ui";

export default function NotFound() { return <PageShell><StatusScene eyebrow="404 / Room not found" title={<>A different door,<br /><em>perhaps.</em></>} description="This little corner doesn’t exist. Let’s find your way back to the things that do." actionLabel="Back to Museum of Me" symbol="?" /></PageShell>; }
