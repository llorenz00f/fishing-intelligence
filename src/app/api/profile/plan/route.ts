import { getAccount } from "@/infrastructure/supabase/account";
import { canSwitchTestPlan, testPlanSchema } from "@/domain/account/access";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";

export async function PATCH(request: Request) {
  try {
    const input = testPlanSchema.parse(await readJson(request));
    const account = await getAccount();
    if (!account) throw new ApiError("Accedi al tuo account.", 401);
    if (!canSwitchTestPlan(account.profile)) throw new ApiError("Il piano di test e riservato ad admin e beta tester.", 403);
    const { data, error } = await account.supabase.from("profiles").update({ plan: input.plan }).eq("id", account.user.id).select("plan").single();
    if (error) throw new ApiError("Piano non aggiornato. Riprova.", error.code === "42501" ? 403 : 503);
    return privateJson({ plan: data.plan });
  } catch (error) { return apiError(error); }
}
