import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { AuthForm } from "@/components/auth-form";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
import { InteriorIntro } from "@/components/scrapbook-ui";
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <PageShell><section className="interior-page scrapbook-workspace auth-workspace"><div><InteriorIntro eyebrow="A little closer to your world" title={<>Come on in.<br /><em>This is your place.</em></>} description="Somewhere between a love letter and a time capsule. A museum made by the people who know you." /><div className="interior-visual"><HeroMemoryOrbit compact /></div></div><section className="form-panel paper-form auth-card" aria-labelledby="auth-title"><span className="paper-clip" aria-hidden="true" /><p className="interior-kicker">Your invitation to begin</p><h2 id="auth-title" className="paper-form-title">Make yourself at home.</h2><p className="form-lede">Sign in or create your account securely with Google. No additional Authenticator code is required.</p>{error === "callback" && <p role="alert" className="form-message is-error">Google sign-in could not be completed. Please try again.</p>}<AuthForm /><p className="form-footnote"><Link href="/privacy">How we look after your memories</Link></p></section></section></PageShell>;
}
