import { z } from "zod";
import { getAccount } from "@/infrastructure/supabase/account";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";

const eventSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  sessionId: z.uuid(),
  type: z.enum(["STRIKE", "CATCH", "SPOT_CHANGE", "NOTE", "PHOTO"]),
  timestamp: z.string().datetime(),
  note: z.string().max(2000).optional(),
  synced: z.boolean().default(false),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      label: z.string().optional(),
    })
    .optional(),
}).strict();

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
}).strict();

export async function POST(request: Request) {
  try {
    const input = bodySchema.parse(await readJson(request));
    const account = await getAccount();
    if (!account) throw new ApiError("La sessione e scaduta. Accedi di nuovo.", 401);
    if (input.events.some(event => Date.parse(event.timestamp) > Date.now() + 60_000)) throw new ApiError("Orario evento non valido.", 400);
    const { data, error } = await account.supabase.rpc("record_session_events", { events: input.events });
    if (error) throw new ApiError("Eventi non salvati. Riprova.", error.code === "42501" ? 403 : 503);
    return privateJson({ ok: true, accepted: data });
  } catch (error) { return apiError(error); }
}
