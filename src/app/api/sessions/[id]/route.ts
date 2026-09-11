import { z } from "zod";
import { getAccount } from "@/infrastructure/supabase/account";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = z.object({ endTime: z.iso.datetime() }).strict().parse(await readJson(request));
    const id = z.uuid().parse((await context.params).id);
    const account = await getAccount();
    if (!account) throw new ApiError("La sessione e scaduta. Accedi di nuovo.", 401);
    const { data: session, error: readError } = await account.supabase.from("sessions").select("start_time,end_time").eq("id", id).eq("user_id", account.user.id).maybeSingle();
    if (readError) throw readError;
    if (!session) throw new ApiError("Sessione non trovata.", 404);
    if (Date.parse(input.endTime) < Date.parse(session.start_time) || Date.parse(input.endTime) > Date.now() + 60_000) throw new ApiError("Orario di fine non valido.", 400);
    if (session.end_time) return privateJson({ endTime: session.end_time });
    const { error } = await account.supabase.from("sessions").update({ end_time: input.endTime }).eq("id", id).eq("user_id", account.user.id);
    if (error) throw error;
    return privateJson(input);
  } catch (error) { return apiError(error); }
}
