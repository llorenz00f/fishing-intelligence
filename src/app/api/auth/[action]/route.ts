import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getAccount } from "@/infrastructure/supabase/account";
import { authErrorMessage, loginSchema, signupSchema, recoverySchema, passwordSchema } from "@/domain/account/auth";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const body = await readJson(request);
    const { action } = await context.params;
    const supabase = await createSupabaseServerClient();
    if (!supabase) throw new ApiError("L'accesso non e ancora disponibile. Riprova piu tardi.", 503);
    const origin = new URL(request.url).origin;
    if (action === "signup") {
      const input = signupSchema.parse(body);
      const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password,
        options: { data: { is_beta_tester: input.isBetaTester }, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } });
      if (error) throw new ApiError(authErrorMessage(error), error.status === 429 ? 429 : 400);
      if (data.user?.identities?.length === 0) throw new ApiError(authErrorMessage({ code: "user_already_exists" }), 409);
      return privateJson({ confirmationRequired: !data.session, next: data.session ? "/onboarding" : null });
    }
    if (action === "login") {
      const input = loginSchema.parse(body);
      const { data, error } = await supabase.auth.signInWithPassword(input);
      if (error || !data.user) throw new ApiError(authErrorMessage(error ?? {}), error?.status === 429 ? 429 : 401);
      const { data: profile, error: profileError } = await supabase.from("profiles").select("onboarding_completed").eq("id", data.user.id).single();
      if (profileError) throw new ApiError("Profilo non disponibile. Riprova tra poco.", 503);
      return privateJson({ next: profile.onboarding_completed ? "/dashboard" : "/onboarding" });
    }
    if (action === "recover") {
      const input = recoverySchema.parse(body);
      const { error } = await supabase.auth.resetPasswordForEmail(input.email, { redirectTo: `${origin}/auth/callback?next=/profile/security` });
      if (error) throw new ApiError(authErrorMessage(error), error.status === 429 ? 429 : 400);
      return privateJson({ message: "Se l'indirizzo e registrato, riceverai un link per reimpostare la password." });
    }
    if (action === "logout") {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new ApiError("Uscita non riuscita. Riprova.", 503);
      return privateJson({ next: "/login" });
    }
    if (action === "password") {
      if (!await getAccount()) throw new ApiError("La sessione e scaduta. Accedi di nuovo.", 401);
      const input = passwordSchema.parse(body);
      const { error } = await supabase.auth.updateUser({ password: input.password });
      if (error) throw new ApiError(authErrorMessage(error), 400);
      return privateJson({ message: "Password aggiornata." });
    }
    throw new ApiError("Operazione non trovata.", 404);
  } catch (error) { return apiError(error); }
}
