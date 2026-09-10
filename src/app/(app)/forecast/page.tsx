import { ForecastExplorer } from "@/components/forecast/ForecastExplorer";
import { getDemoForecast, demoHistory, demoLocation } from "@/data/demo";
import { ForecastService } from "@/application/services/forecast-service";
import { createProviderBundle } from "@/infrastructure/providers/provider-factory";
import { disciplines, techniques } from "@/data/catalog";
export default async function ForecastPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const lat = typeof query.lat === "string" ? Number(query.lat) : NaN;
  const lng = typeof query.lng === "string" ? Number(query.lng) : NaN;
  const validPoint = Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180;
  const discipline = disciplines.find(item => item.code === query.discipline)?.code ?? "SHORE_SPINNING";
  const technique = techniques.find(item => item.code === query.technique && item.discipline === discipline)?.code ?? techniques.find(item => item.discipline === discipline)!.code;
  const forecast = validPoint ? await new ForecastService(createProviderBundle()).getForecast({
    location: { latitude: lat, longitude: lng, label: typeof query.label === "string" ? query.label : demoLocation.label },
    discipline, technique, species: "SPIGOLA", start: new Date().toISOString(), days: 7, history: demoHistory,
  }) : await getDemoForecast();
  return <ForecastExplorer initialForecast={forecast} />;
}
