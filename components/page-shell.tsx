import { SiteHeader } from "@/components/site-header";

export function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`min-h-screen ${className}`}><SiteHeader />{children}</main>;
}
