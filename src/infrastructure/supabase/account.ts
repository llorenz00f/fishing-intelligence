import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import type { AccountProfile } from "@/domain/account/access";

export const getAccount = cache(async () => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data, error: profileError } = await supabase.from("profiles")
    .select("id,display_name,role,is_beta_tester,plan,onboarding_completed,home_coordinates,preferred_units")
    .eq("id", user.id).single();
  if (profileError || !data) throw new Error("Profilo non disponibile. Riprova tra poco.");
  const profile: AccountProfile = {
    id: user.id, email: user.email ?? "", displayName: data.display_name,
    role: data.role === "admin" ? "admin" : "user", isBetaTester: data.is_beta_tester === true,
    plan: data.plan === "PRO" || data.plan === "CAPTAIN" ? data.plan : "FREE",
    onboardingCompleted: data.onboarding_completed, homeLocation: data.home_coordinates,
    preferredUnits: data.preferred_units,
  };
  return { supabase, user, profile };
});

export async function requireAccount() {
  const account = await getAccount();
  if (!account) redirect("/login");
  return account;
}
