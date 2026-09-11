import { ForecastExplorer } from "@/components/forecast/ForecastExplorer";
import { getUserForecast } from "@/application/services/user-forecast";
import { ForecastLocation } from "@/components/forecast/ForecastLocation";
import { MobileHeader } from "@/components/app/MobileHeader";
import { EmptyState } from "@/components/ui/ProductPrimitives";
import { disciplines, techniques } from "@/data/catalog";
import { getForecastLocation } from "@/infrastructure/repositories/forecast-location";
export default async function ForecastPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const lat = typeof query.lat === "string" ? Number(query.lat) : NaN;
  const lng = typeof query.lng === "string" ? Number(query.lng) : NaN;
  const validPoint = Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180;
  const discipline = disciplines.find(item => item.code === query.discipline)?.code ?? "SHORE_SPINNING";
  const technique = techniques.find(item => item.code === query.technique && item.discipline === discipline)?.code ?? techniques.find(item => item.discipline === discipline)!.code;
  const location = validPoint ? { latitude: lat, longitude: lng, label: typeof query.label === "string" ? query.label.slice(0, 100) : "Area selezionata" } : await getForecastLocation();
  if (!location) return <><MobileHeader title="Quando andare." /><EmptyState title="Previsioni per la tua zona"><p>Scegli una posizione per consultare il meteo reale.</p><ForecastLocation location={null} /></EmptyState></>;
  const forecast = await getUserForecast(location, discipline, technique);
  return <ForecastExplorer initialForecast={forecast} />;
}
