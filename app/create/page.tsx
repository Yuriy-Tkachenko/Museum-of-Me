import { TrackEvent } from "@/components/analytics";
import { PageShell } from "@/components/page-shell";
import { CreateMuseumExperience } from "@/components/create-museum-experience";
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  return <PageShell>{welcome === "1" && <TrackEvent event="signup_completed" />}<section className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-10 md:pt-16"><CreateMuseumExperience /></section></PageShell>;
}
