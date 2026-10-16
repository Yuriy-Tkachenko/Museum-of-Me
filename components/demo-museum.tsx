import Image from "next/image";
import { CreateLink } from "@/components/analytics";
import { EditorialSurface } from "@/components/editorial-surface";
import { ReferenceMuseumCollage } from "@/components/reference-museum-collage";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SketchIcon } from "@/components/sketch-icon";
import { referenceExhibits } from "@/lib/reference-exhibits";

export function DemoMuseum() {
  return <EditorialSurface className="app-shell grain editorial-home reference-home demo-museum-page">
    <SiteHeader referenceBrand />
    <section className="demo-museum-hero" aria-labelledby="demo-museum-title">
      <div className="demo-museum-copy">
        <p className="reference-kicker">through friends&apos; eyes</p>
        <h1 id="demo-museum-title" translate="no"><span>Museum</span><span>of Yuri</span></h1>
        <p className="demo-museum-lede">Not a biography. Not a profile. Just the small things friends remember: a city at night, black coffee, forty open tabs and one very important cat.</p>
        <div className="demo-museum-actions"><a href="#collection" className="primary-link">Step inside <span aria-hidden="true">↓</span></a><CreateLink source="reveal" className="quiet-link">Create your museum</CreateLink></div>
        <p className="demo-hand-note">one person — five points of view <span aria-hidden="true">♡</span></p>
      </div>
      <ReferenceMuseumCollage detailCta={false} />
    </section>

    <section id="collection" className="demo-collection" aria-labelledby="demo-collection-title">
      <header className="demo-collection-heading">
        <p>Collected by friends</p>
        <h2 id="demo-collection-title">Little things.<br /><em>A whole person.</em></h2>
        <span aria-hidden="true"><SketchIcon kind="invite" /></span>
      </header>
      <div className="demo-exhibit-grid">
        {referenceExhibits.map((exhibit, index) => <article className={`demo-exhibit-card demo-exhibit-${exhibit.id}`} key={exhibit.id}>
          <figure>
            <span className="demo-card-tape" aria-hidden="true" />
            <Image src={`/images/reference/photo-${exhibit.id}.webp`} width={exhibit.width} height={exhibit.height} sizes="(max-width: 600px) 88vw, (max-width: 1000px) 42vw, 30vw" alt={exhibit.alt} unoptimized />
            <figcaption><small>Memory {String(index + 1).padStart(2, "0")}</small><h3 translate="no">{exhibit.title}</h3></figcaption>
          </figure>
          <p translate="no">“{exhibit.story}”</p>
        </article>)}
        <aside className="demo-grid-note"><span aria-hidden="true">↗</span><p>Everything ordinary<br />becomes an exhibit.</p></aside>
      </div>
    </section>

    <section className="demo-museum-closing" aria-labelledby="demo-closing-title">
      <p className="reference-kicker">your turn</p>
      <h2 id="demo-closing-title">What would your<br /><em>friends choose?</em></h2>
      <p>Create a museum, send one link and let the people who know you fill in the rest.</p>
      <CreateLink source="reveal" className="primary-link">Create your museum <span aria-hidden="true">→</span></CreateLink>
    </section>
    <SiteFooter />
  </EditorialSurface>;
}
