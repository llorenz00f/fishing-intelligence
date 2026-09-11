import "server-only";
import { ForecastService } from "./forecast-service";
import { createProviderBundle } from "@/infrastructure/providers/provider-factory";
import { getSessions, sessionHistory } from "@/infrastructure/repositories/user-data";
import type { LocationPoint, DisciplineCode, TechniqueCode } from "@/types/product";
export async function getUserForecast(location: LocationPoint, discipline: DisciplineCode = "SHORE_SPINNING", technique: TechniqueCode = "SHORE_SPINNING", species?: string, days = 7) {
  const history = sessionHistory(await getSessions());
  return new ForecastService(createProviderBundle()).getForecast({ location, discipline, technique, species, start: new Date().toISOString(), days, history });
}
