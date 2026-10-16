import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const destination = requested === "/create" ? "/create" : requested === "/admin" ? "/admin/login" : "/dashboard";
  if (!code || code.length > 2048) return NextResponse.redirect(new URL("/auth?error=callback", url.origin));
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/auth?error=callback", url.origin));
    const newSignup = data.user && Math.abs(Date.parse(data.user.last_sign_in_at ?? "") - Date.parse(data.user.created_at)) < 60000;
    return NextResponse.redirect(new URL(requested === "/admin" ? destination : newSignup ? "/create?welcome=1" : destination, url.origin));
  } catch { return NextResponse.redirect(new URL("/auth?error=callback", url.origin)); }
}
