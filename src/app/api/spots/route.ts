import { z } from "zod";
import { getAccount } from "@/infrastructure/supabase/account";
import { locationSchema, canUseFeature } from "@/domain/account/access";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";
const schema = z.object({ name: z.string().trim().min(1).max(100), location: locationSchema,
  discipline: z.enum(["SURFCASTING", "SHORE_SPINNING", "BOAT", "SPEARFISHING"]).default("SHORE_SPINNING") }).strict();
export async function POST(request: Request) {
  try {
    const input = schema.parse(await readJson(request));
    const account = await getAccount();
    if (!account) throw new ApiError("Accedi per salvare uno spot.", 401);
    if (!canUseFeature(account.profile, "UNLIMITED_SPOTS")) {
      const { count, error } = await account.supabase.from("spots").select("id", { count: "exact", head: true }).eq("user_id", account.user.id);
      if (error) throw error;
      if ((count ?? 0) >= 5) throw new ApiError("Hai raggiunto i 5 spot del piano FREE. Scopri PRO per salvarne altri.", 403);
    }
    const { data, error } = await account.supabase.from("spots").insert({ user_id: account.user.id, name: input.name,
      location: `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})`, discipline_code: input.discipline }).select("id").single();
    if (error) throw new ApiError(error.code === "42501" ? "Limite spot raggiunto o operazione non consentita." : "Spot non salvato. Riprova.", error.code === "42501" ? 403 : 503);
    return privateJson({ ...input, id: data.id }, 201);
  } catch (error) { return apiError(error); }
}
