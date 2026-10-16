import type { ReactNode } from "react";
import Link from "next/link";

export function InteriorIntro({ eyebrow, title, description, children, className = "" }: { eyebrow: string; title: ReactNode; description: ReactNode; children?: ReactNode; className?: string }) {
  return <header className={`interior-intro ${className}`.trim()}>
    <p className="interior-kicker">{eyebrow}</p>
    <h1 className="interior-title">{title}</h1>
    <p className="interior-description">{description}</p>
    {children}
  </header>;
}

export function StatusScene({ eyebrow, title, description, actionHref = "/", actionLabel = "Back home", symbol = "✦", children }: { eyebrow: string; title: ReactNode; description: ReactNode; actionHref?: string; actionLabel?: string; symbol?: string; children?: ReactNode }) {
  return <section className="status-scene" aria-labelledby="status-title">
    <div className="status-polaroid" aria-hidden="true"><span>{symbol}</span><i /></div>
    <div className="status-copy">
      <p className="interior-kicker">{eyebrow}</p>
      <h1 id="status-title" className="interior-title">{title}</h1>
      <p className="interior-description">{description}</p>
      <div className="status-actions">{children ?? <Link href={actionHref} className="primary-link">{actionLabel} <span aria-hidden="true">↗</span></Link>}</div>
    </div>
  </section>;
}

export function MuseumLoadingScene() {
  return <section className="museum-loader" role="status" aria-live="polite" aria-label="Opening your museum">
    <div className="loader-collage" aria-hidden="true">
      <span className="loader-card loader-card-one" />
      <span className="loader-card loader-card-two" />
      <span className="loader-card loader-card-three" />
      <span className="loader-portrait"><i /></span>
      <span className="loader-tape" />
    </div>
    <div className="loader-copy">
      <p className="interior-kicker">The doors are opening</p>
      <h1 className="interior-title">Hanging your<br /><em>little stories…</em></h1>
      <p>Photos, places and tiny details are finding their place.</p>
      <span className="loader-progress"><i /></span>
    </div>
  </section>;
}
