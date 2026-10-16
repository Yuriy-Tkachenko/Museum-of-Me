import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { AuthForm } from "@/components/auth-form";
import { HeroMemoryOrbit } from "@/components/hero-memory-orbit";
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <PageShell><section className="mx-auto grid min-h-[calc(100svh-180px)] max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:gap-20 md:px-10"><div><p className="eyebrow mb-6">A little closer to your world</p><h1 className="display interior-heading">Come on in.<br /><em className="gold-text">This is your place.</em></h1><p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">Somewhere between a love letter and a time capsule. A museum made by the people who know you.</p><div className="interior-visual"><HeroMemoryOrbit compact /></div></div><div className="form-panel"><p className="eyebrow">Your invitation to begin</p><h2 className="display mt-4 text-4xl">Make yourself at home.</h2><p className="mt-4 text-xs leading-relaxed text-muted">Sign in or create your account securely with Google. No additional Authenticator code is required.</p>{error === "callback" && <p role="alert" className="mt-6 rounded-xl bg-red-100 p-4 text-sm text-red-800">Google sign-in could not be completed. Please try again.</p>}<AuthForm /><p className="mt-7 text-center text-xs text-muted"><Link className="underline underline-offset-4" href="/privacy">How we look after your memories</Link></p></div></section></PageShell>;
}
