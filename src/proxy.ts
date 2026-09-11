import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, getSupabasePublicKey, hasSupabaseBrowserConfig } from "@/lib/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabaseBrowserConfig()) return response;
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, getSupabasePublicKey()!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/forecast/:path*", "/map/:path*", "/sessions/:path*", "/insights/:path*", "/profile/:path*", "/assistant/:path*", "/onboarding", "/api/:path*", "/auth/:path*"],
};
