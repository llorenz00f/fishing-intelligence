import { z } from "zod";
import { getAccount } from "@/infrastructure/supabase/account";
import { locationSchema } from "@/domain/account/access";
import { disciplines, techniques, species } from "@/data/catalog";
import { ApiError, apiError, privateJson, readJson } from "@/lib/api";
import { ForecastService } from "@/application/services/forecast-service";
import { createProviderBundle } from "@/infrastructure/providers/provider-factory";
const schema = z.object({ id: z.uuid(), discipline: z.string(), technique: z.string(), targetSpecies: z.string().optional(),
  location: locationSchema, spot: z.string().trim().min(1).max(100) }).strict();
export async function POST(request: Request) {
  try {
    const input = schema.parse(await readJson(request));
    const account = await getAccount();
    if (!account) throw new ApiError("Accedi per iniziare una sessione.", 401);
    const discipline = disciplines.find(item => item.code === input.discipline);
    const technique = techniques.find(item => item.code === input.technique && item.discipline === input.discipline);
    if (!discipline || !technique || (input.targetSpecies && !species.some(item => item.code === input.targetSpecies))) throw new ApiError("Tecnica o specie non valida.", 400);
    const start = new Date().toISOString();
    const { data, error } = await account.supabase.from("sessions").insert({ id: input.id, user_id: account.user.id,
      discipline_code: discipline.code, technique_code: technique.code, target_species_code: input.targetSpecies || null,
      start_time: start, start_location: `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})`, primary_spot_name: input.spot }).select("id").single();
    if (error?.code === "23505") {
      const { data: existing } = await account.supabase.from("sessions").select("id").eq("id", input.id).eq("user_id", account.user.id).maybeSingle();
      if (existing) return privateJson({ id: existing.id });
    }
    if (error || !data) throw new ApiError("Sessione non salvata. Riprova.", 503);
    // A provider outage must not discard a real session or generate synthetic observations.
    try {
      const forecast = await new ForecastService(createProviderBundle()).getForecast({ location: input.location,
        discipline: discipline.code, technique: technique.code, species: input.targetSpecies, start, days: 1 });
      const snapshot = forecast.current.snapshot;
      if (snapshot.dataCoverage > 0 && !/mock|fallback/i.test(snapshot.provider)) {
        await account.supabase.from("environment_snapshots").insert({ user_id: account.user.id, session_id: data.id,
          timestamp: snapshot.timestamp, location: `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})`,
          weather: snapshot.weather, marine: snapshot.marine, astronomical: snapshot.astronomical, derived: snapshot.derived,
          provider: snapshot.provider, fetched_at: snapshot.fetchedAt, missing_fields: snapshot.missingFields, data_coverage: snapshot.dataCoverage });
      }
    } catch { /* The session exists even when environmental observations are unavailable. */ }
    return privateJson({ id: data.id }, 201);
  } catch (error) { return apiError(error); }
}
