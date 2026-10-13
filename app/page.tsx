import Link from "next/link";
import { EditorialSurface } from "@/components/editorial-surface";
import { SiteHeader } from "@/components/site-header";
import { CreateLink, TrackEvent } from "@/components/analytics";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
import { SiteFooter } from "@/components/site-footer";
import { LandingMotion } from "@/components/landing-motion";

export default function Home() {
  return <EditorialSurface className="app-shell grain editorial-home"><LandingMotion /><TrackEvent event="landing_view" /><SiteHeader />
    <section className="editorial-hero">
      <div className="editorial-copy"><p className="eyebrow"><span className="hero-status-dot" /> A portrait only your friends could make</p>
        <h1 className="display"><span className="hero-title-line"><span>A little world.</span></span><span className="hero-title-line"><span>A thousand</span></span><span className="hero-title-line"><em>pieces of you.</em></span></h1>
        <p>A song. A place. The way you take your coffee.<br />Let your friends turn the things that remind them of you into a museum.</p>
        <div className="hero-actions"><CreateLink source="landing" className="primary-link">Create your museum <span>↗</span></CreateLink><Link href="/demo" className="quiet-link">Step inside a sample <span>→</span></Link></div>
        <small className="hero-footnote">Free to create · No account needed for your friends</small>
      </div>
      <HeroMemoryOrbit />
      <div className="hero-bottom-line"><span>PERSONAL STORIES. COLLECTED WITH LOVE.</span><a href="#how-it-works">Discover the idea <span aria-hidden="true">↓</span></a><span>YOUR PEOPLE ARE THE ARTISTS.</span></div>
    </section>
    <div className="memory-ribbon" aria-hidden="true"><div className="memory-ribbon-track">{[0,1,2,3].map(index => <div className="memory-ribbon-group" key={index}><span>A song you always play</span><i>✳</i><span>A place you call home</span><i>✳</i><span>A moment they kept</span><i>✳</i></div>)}</div></div>
    <section className="collection-preview"><div className="collection-intro" data-reveal><p className="eyebrow">Ordinary things. Extraordinary meaning.</p><h2 className="display">You live in<br /><em>the little details.</em></h2><p>Not the perfect pictures. The things that make someone smile and say, “that is so you.”</p><Link href="/demo" className="collection-text-link">Explore a museum <span>↗</span></Link></div>
      <div className="collection-still-life"><Link href="/demo" className="preview-art preview-art-coffee" data-reveal aria-label="Explore the coffee memory"><div className="preview-image preview-coffee" role="img" aria-label="A cup of coffee" /><span><small>01 / THE EVERYDAY</small><strong>One more coffee.</strong><i>↗</i></span></Link><Link href="/demo" className="preview-art preview-art-sea" data-reveal aria-label="Explore the sunset memory"><div className="preview-image preview-sea" role="img" aria-label="Sunset over the sea" /><span><small>02 / THE UNFORGETTABLE</small><strong>That evening by the sea.</strong><i>↗</i></span></Link><span className="collection-handnote" data-reveal>Small things.<br />A whole person.</span></div>
    </section>
    <section id="how-it-works" className="home-section"><div className="section-heading" data-reveal><div><p className="eyebrow mb-5">Not a profile. A feeling.</p><h2 className="display">A whole world.<br /><em className="gold-text">And you at the centre.</em></h2></div><p>We leave little pieces of ourselves with the people we love. This is a place to bring them all together.</p></div>
      <div className="steps-grid">{[
        ["01", "Make a little space", "Give your museum a name. Choose how many memories will open its doors."],
        ["02", "Let your people in", "Send a private invitation. Each friend adds one thing that feels unmistakably like you."],
        ["03", "Meet yourself again", "When the collection is complete, discover your museum and share a little piece of it."],
      ].map(([number,title,copy], index) => <article className={`step step-${index}`} data-reveal key={number}><div className="step-art" aria-hidden="true">{index === 0 ? <div className="step-mini-frame">M<span>YOUR MUSEUM</span></div> : index === 1 ? <div className="step-mini-invite"><span>↗</span><i>♡</i><b>✳</b></div> : <div className="step-mini-reveal"><span>✦</span><span>✳</span><span>✦</span></div>}</div><span>{number} /</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className="closing-invitation"><div className="closing-orbit closing-orbit-one" aria-hidden="true" /><div className="closing-orbit closing-orbit-two" aria-hidden="true" /><div data-reveal><p className="eyebrow">Some things can only be seen by others</p><h2 className="display">What does <em className="gold-text">your world</em><br />look like to them?</h2><CreateLink source="landing" className="primary-link">Start your collection <span>↗</span></CreateLink><p className="closing-note">Memories stay hidden while collecting.<br />Your gallery becomes public when its doors open.</p></div></section>
    <SiteFooter />
  </EditorialSurface>;
}
