import "server-only";
import { cache } from "react";
import { requireAccount } from "@/infrastructure/supabase/account";
import type { FishingSession, SessionEvent } from "@/domain/sessions/types";
import type { HistoricalSessionFeature } from "@/domain/personalization/types";
import type { SpotView } from "@/domain/account/data";

export const getSpots = cache(async (): Promise<SpotView[]> => {
  const { supabase, user } = await requireAccount();
  const { data, error } = await supabase.from("spots").select("id,name,latitude,longitude,discipline_code,notes").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Spot non disponibili. Riprova.");
  return data.map(row => ({ id: row.id, name: row.name, location: { latitude: row.latitude, longitude: row.longitude, label: row.name }, discipline: row.discipline_code ?? undefined, notes: row.notes ?? undefined }));
});

type Snapshot = NonNullable<FishingSession["weatherSnapshot"]>;
type SessionRow = {
  id: string; user_id: string; discipline_code: FishingSession["discipline"]; technique_code: FishingSession["technique"];
  target_species_code: string | null; start_time: string; end_time: string | null; latitude: number; longitude: number;
  primary_spot_name: string | null; notes: string | null; outcome: FishingSession["outcome"]; rating: number | null;
  session_events: Array<{ id: string; client_id: string; event_type: SessionEvent["type"]; occurred_at: string; note: string | null }>;
  catches: Array<{ id: string; species_code: string | null; caught_at: string; released: boolean }>;
  environment_snapshots: Array<{ timestamp: string; weather: Snapshot["weather"]; marine: Snapshot["marine"]; astronomical: Snapshot["astronomical"]; derived: Snapshot["derived"]; provider: string; fetched_at: string; missing_fields: string[]; data_coverage: number }>;
};
const sessionColumns = "*,session_events!session_events_session_id_fkey(*),catches!catches_session_id_fkey(*),environment_snapshots!environment_snapshots_session_id_fkey(*)";
function sessionFromRow(row: SessionRow): FishingSession {
  const location = { latitude: row.latitude, longitude: row.longitude, label: row.primary_spot_name ?? undefined };
  const snapshot = row.environment_snapshots?.[0];
  return {
    id: row.id, userId: row.user_id, discipline: row.discipline_code, technique: row.technique_code,
    targetSpecies: row.target_species_code ?? undefined, startTime: row.start_time, endTime: row.end_time ?? undefined,
    startLocation: location, primarySpot: row.primary_spot_name ?? undefined, notes: row.notes ?? undefined,
    outcome: row.outcome, rating: row.rating ?? undefined,
    events: (row.session_events ?? []).map(event => ({ id: event.id, clientId: event.client_id, sessionId: row.id, type: event.event_type, timestamp: event.occurred_at, note: event.note ?? undefined, synced: true })),
    catches: (row.catches ?? []).map(item => ({ id: item.id, sessionId: row.id, species: item.species_code ?? "", timestamp: item.caught_at, released: item.released })),
    weatherSnapshot: snapshot ? { timestamp: snapshot.timestamp, location, weather: snapshot.weather, marine: snapshot.marine,
      astronomical: snapshot.astronomical, derived: snapshot.derived, provider: snapshot.provider, fetchedAt: snapshot.fetched_at,
      missingFields: snapshot.missing_fields, dataCoverage: snapshot.data_coverage } : undefined,
  };
}
export const getSessions = cache(async (): Promise<FishingSession[]> => {
  const { supabase, user } = await requireAccount();
  const { data, error } = await supabase.from("sessions").select(sessionColumns).eq("user_id", user.id).order("start_time", { ascending: false }).limit(500);
  if (error) throw new Error("Diario non disponibile. Riprova.");
  return (data as unknown as SessionRow[]).map(sessionFromRow);
});
export async function getSession(id: string): Promise<FishingSession | null> {
  const { supabase, user } = await requireAccount();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("sessions").select(sessionColumns).eq("user_id", user.id).eq("id", id).maybeSingle();
  if (error) throw new Error("Sessione non disponibile. Riprova.");
  return data ? sessionFromRow(data as unknown as SessionRow) : null;
}
export function sessionHistory(sessions: FishingSession[]): HistoricalSessionFeature[] {
  return sessions.filter(session => session.endTime).map(session => {
    const time = new Date(session.startTime);
    const snapshot = session.weatherSnapshot;
    return { id: session.id, discipline: session.discipline, technique: session.technique, species: session.targetSpecies,
      month: time.getUTCMonth() + 1, timeOfDayMinutes: time.getUTCHours() * 60 + time.getUTCMinutes(),
      durationMinutes: Math.max(0, (Date.parse(session.endTime!) - time.getTime()) / 60000),
      windSpeedKph: snapshot?.weather.windSpeedKph, windDirectionDeg: snapshot?.weather.windDirectionDeg,
      waveHeightM: snapshot?.marine.waveHeightM, waveDirectionDeg: snapshot?.marine.waveDirectionDeg,
      seaSurfaceTemperatureC: snapshot?.marine.seaSurfaceTemperatureC, currentVelocityMps: snapshot?.marine.oceanCurrentVelocityMps,
      pressureMslHpa: snapshot?.weather.pressureMslHpa, pressureTrend: snapshot?.weather.pressureTrend,
      outcome: { catches: session.catches.length, strikes: session.events.filter(event => event.type === "STRIKE").length, rating: session.rating },
    };
  });
}
