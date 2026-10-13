import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase browser client is using no configured environment variables.");
}

export const supabaseBrowser = createBrowserClient<Database, "public">(
  url || "https://demo.supabase.co",
  anonKey || "demo-anon-key",
) as unknown as SupabaseClient;
