import Image from "next/image";
import type { Metadata } from "next";
import { EditorialSurface } from "@/components/editorial-surface";
import { SiteHeader } from "@/components/site-header";
import { CreateLink, TrackEvent } from "@/components/analytics";
import { ReferenceMuseumCollage } from "@/components/reference-museum-collage";
import { SiteFooter } from "@/components/site-footer";
import { SketchIcon } from "@/components/sketch-icon";

export const metadata: Metadata = {
  title: "Как тебя видят друзья",
  description: "Создай личный Museum of Me, пригласи друзей и собери музей ассоциаций, историй и вещей, которые напоминают им о тебе.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Museum of Me — как тебя видят друзья",
    description: "Один человек. Пять разных взглядов. Собери свой музей глазами друзей.",
  },
};

export default function Home() {
  return <EditorialSurface className="app-shell grain editorial-home reference-home">
    <TrackEvent event="landing_view" /><SiteHeader referenceBrand />
    <section className="editorial-hero" aria-labelledby="landing-title">
      <div className="reference-copy">
        <p className="reference-kicker" translate="no">friends&apos; perspective</p>
        <h1 id="landing-title" className="reference-title" translate="no"><span>Museum</span><span>of me</span></h1>
        <span className="reference-smiley" aria-hidden="true"><i /><b /></span>
        <h2 className="reference-question">How do your friends see you?</h2>
        <p className="reference-intro">Send a link to your friends. Collect the little things they associate with you. Open your own museum.</p>
        <div className="hero-actions"><CreateLink source="landing" className="primary-link">Create your museum <span aria-hidden="true">→</span></CreateLink><a href="/demo" className="quiet-link">See an example</a></div>
        <div className="reference-friends"><div className="reference-friend-portraits" role="group" aria-label="Пять портретов друзей">{[1,2,3,4,5].map(index => <Image key={index} src={`/images/reference/friend-${index}.webp`} width={56} height={56} alt="" unoptimized />)}</div><p>One person. Five different points of view.</p></div>
      </div>
      <ReferenceMuseumCollage />
    </section>
    <section id="how-it-works" className="reference-steps" aria-labelledby="steps-title">
      <h2 id="steps-title">Three steps. And you are the exhibit.</h2>
      <ol className="reference-steps-grid">{[
        { id: "create", icon: "create" as const, title: "Создай музей", copy: "Add your name, choose a style and receive your personal link." },
        { id: "invite", icon: "invite" as const, title: "Invite your friends", copy: "Send the link to people who know you. Let them add their associations." },
        { id: "discover", icon: "portrait" as const, title: "See yourself again", copy: "Collect every story in one place. See yourself through other people’s eyes." },
      ].map((step,index) => <li className={`reference-step reference-step-${index}`} key={step.id}><span className="reference-step-number" aria-hidden="true">0{index+1}</span><SketchIcon className="reference-step-icon" kind={step.icon} /><div><h3>{step.title}</h3><p>{step.copy}</p></div></li>)}</ol>
    </section>
    <SiteFooter />
  </EditorialSurface>;
}
