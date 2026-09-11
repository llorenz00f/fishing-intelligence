import { getAccount } from "@/infrastructure/supabase/account";
import { profileUpdateSchema } from "@/domain/account/access";
import { species as speciesCatalog } from "@/data/catalog";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";

export async function GET() {
  try {
    const account = await getAccount();
    if (!account) throw new ApiError("Accedi al tuo account.", 401);
    return privateJson(account.profile);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const input = profileUpdateSchema.parse(await readJson(request));
    const account = await getAccount();
    if (!account) throw new ApiError("La sessione e scaduta. Accedi di nuovo.", 401);
    if (input.species?.some(code => !speciesCatalog.some(item => item.code === code))) throw new ApiError("Specie non valida.", 400);
    const { error } = await account.supabase.rpc("update_own_profile", { changes: input });
    if (error) throw new ApiError("Profilo non salvato. Riprova.", error.code === "42501" ? 403 : 503);
    return privateJson({ ok: true });
  } catch (error) { return apiError(error); }
}
