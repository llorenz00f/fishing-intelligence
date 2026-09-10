import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseBrowserConfig } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseBrowserConfig()) {
    return null;
  }

  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
