import { EditorialSurface } from "@/components/editorial-surface";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LandingMotion } from "@/components/landing-motion";
export function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <EditorialSurface className={`app-shell grain editorial-home editorial-interior flex min-h-screen flex-col ${className}`}><LandingMotion /><SiteHeader /><div className="flex-1">{children}</div><SiteFooter /></EditorialSurface>;
}
