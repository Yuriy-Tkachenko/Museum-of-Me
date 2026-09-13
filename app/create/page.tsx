import { TrackEvent } from "@/components/analytics";
import { PageShell } from "@/components/page-shell";
import { CreateMuseumForm } from "@/components/create-museum-form";
import { MemoryUniverse } from "@/components/memory-universe";
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  return <PageShell>{welcome === "1" && <TrackEvent event="signup_completed" />}<section className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-10 md:pt-16"><div className="grid items-start gap-9 md:grid-cols-2 md:gap-16"><div><p className="eyebrow mb-6">01 / A space with your name on it</p><h1 className="display interior-heading">Every little thing.<br /><em className="gold-text">Entirely you.</em></h1><p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">Make room for the way your people see you. A few details, and your collection begins.</p><div className="interior-visual"><MemoryUniverse compact portrait interactive={false} /></div></div><div className="form-panel"><p className="eyebrow mb-7">Create your museum</p><CreateMuseumForm /></div></div></section></PageShell>;
}
