import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { MfaForm } from "@/components/mfa-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value?: string) {
  if (value === "/dashboard") return value;
  if (value === "/create" || value === "/create?welcome=1") return value;
  return "/dashboard";
}

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { next } = await searchParams;

  return <PageShell><section className="mx-auto flex min-h-[calc(100svh-180px)] max-w-lg items-center px-5 py-12"><div className="form-panel w-full"><p className="eyebrow">One more step</p><h1 className="display mt-4 text-4xl">Protect your museum.</h1><p className="mt-4 text-xs leading-relaxed text-muted">Google Authenticator adds a second check without SMS or email.</p><MfaForm nextPath={safeNext(next)} /></div></section></PageShell>;
}
