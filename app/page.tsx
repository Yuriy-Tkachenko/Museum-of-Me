import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CreateLink, TrackEvent } from "@/components/analytics";
import { MemoryUniverse } from "@/components/memory-universe";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return <main className="app-shell grain"><TrackEvent event="landing_view" /><SiteHeader />
    <section className="home-hero">
      <div className="hero-copy"><p className="eyebrow">✦ A portrait only your friends could make</p>
        <h1 className="display">You are a thousand<br /><em>little things.</em></h1>
        <p>A song. A place. The way you take your coffee.<br />Let your friends turn the things that remind them of you into a museum.</p>
        <div className="hero-actions"><CreateLink source="landing" className="primary-link">Create your museum <span>↗</span></CreateLink><Link href="/demo" className="quiet-link">Step inside a sample <span>→</span></Link></div>
        <small className="hero-footnote">Free to create · No account needed for your friends</small>
      </div>
      <MemoryUniverse portrait />
    </section>
    <section id="how-it-works" className="home-section"><div className="section-heading"><div><p className="eyebrow mb-5">Not a profile. A feeling.</p><h2 className="display">A whole world.<br /><em className="gold-text">And you at the centre.</em></h2></div><p>We leave little pieces of ourselves with the people we love. This is a place to bring them all together.</p></div>
      <div className="steps-grid">{[
        ["01", "Make a little space", "Give your museum a name. Choose how many memories will open its doors."],
        ["02", "Let your people in", "Send a private invitation. Each friend adds one thing that feels unmistakably like you."],
        ["03", "Meet yourself again", "When the collection is complete, discover your museum and share a little piece of it."],
      ].map(([number,title,copy]) => <article className="step" key={number}><span>{number} /</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className="closing-invitation"><p className="eyebrow">Some things can only be seen by others</p><h2 className="display">What does <em className="gold-text">your world</em><br />look like to them?</h2><CreateLink source="landing" className="primary-link">Start your collection <span>↗</span></CreateLink><p>Memories stay hidden while collecting.<br />Your gallery becomes public when its doors open.</p></section>
    <SiteFooter />
  </main>;
}
