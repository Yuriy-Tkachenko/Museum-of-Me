import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`app-shell grain flex min-h-screen flex-col ${className}`}><SiteHeader /><div className="flex-1">{children}</div><SiteFooter /></main>;
}
