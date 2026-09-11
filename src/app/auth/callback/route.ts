import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { safeAuthDestination } from "@/domain/account/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (supabase) {
    const result = code ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && (type === "signup" || type === "recovery" || type === "email")
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type }) : null;
    if (result && !result.error) return NextResponse.redirect(new URL(safeAuthDestination(url.searchParams.get("next")), url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
