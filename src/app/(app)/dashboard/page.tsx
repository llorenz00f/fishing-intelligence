import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { MobileHeader } from "@/components/app/MobileHeader";
import { ScoreHero } from "@/components/forecast/ScoreCard";
import { EmptyState, PersonalInsightCard } from "@/components/ui/ProductPrimitives";
import { EssentialConditions } from "@/components/ui/EssentialConditions";
import { getUserForecast } from "@/application/services/user-forecast";
import { getSessions, sessionHistory } from "@/infrastructure/repositories/user-data";
import { labelForSpecies, labelForTechnique } from "@/data/catalog";
import { calculateSimilarity } from "@/domain/personalization/similarity";
import { ForecastThemeBridge } from "@/components/appearance/ThemeProvider";
import { getForecastLocation } from "@/infrastructure/repositories/forecast-location";
import { ForecastLocation } from "@/components/forecast/ForecastLocation";
import { LocalTime } from "@/components/ui/LocalTime";
import { DashboardSectionLinks } from "@/components/dashboard/DashboardSectionLinks";

export default async function DashboardPage() {
  await connection();
  const selectedLocation = await getForecastLocation();
  if (!selectedLocation) return <><MobileHeader title="Il tuo mare, oggi." /><EmptyState title="Scegli il tuo mare"><p>Indica una posizione per vedere meteo e previsioni reali.</p><ForecastLocation location={null} /></EmptyState><Link className="primary-action" href="/sessions/new"><Play size={17} />Inizia la prima sessione</Link><DashboardSectionLinks /></>;
  const history = sessionHistory(await getSessions());
  const forecast = await getUserForecast(selectedLocation);
  const current = forecast.current;
  const location = forecast.location.label ?? "Area selezionata";
  const today = forecast.days.find(day => day.date === current.timestamp.slice(0, 10));
  const bestWindow = today?.bestWindow;
  const windowLabel = bestWindow ? <><LocalTime timestamp={bestWindow.start} /> – <LocalTime timestamp={bestWindow.end} /></> : "Non disponibile";
  const similarity = calculateSimilarity({ discipline: forecast.discipline, technique: forecast.technique, species: forecast.species, environment: current.snapshot, history });
  return <>
    <ForecastThemeBridge forecast={forecast} />
    <MobileHeader title="Il tuo mare, oggi." location={location} refresh />
    <ForecastLocation location={forecast.location} autoRefresh />
    <div className="dashboard-grid">
      <div className="stack dashboard-primary">
        <ScoreHero title="OGGI, PER TE" score={current.score} location={location} technique={labelForTechnique(forecast.technique)} species={labelForSpecies(forecast.species)} window={windowLabel}
          cta={<Link className="primary-action hero-cta" href="/sessions/new"><Play size={17} />Inizia sessione<ArrowRight size={17} /></Link>}>
        </ScoreHero>
        <section className="dashboard-conditions-section" aria-labelledby="essential-conditions-title">
          <div className="section-heading"><h2 id="essential-conditions-title">Condizioni essenziali</h2><span className="help-text"><LocalTime timestamp={current.timestamp} /></span></div>
          <EssentialConditions snapshot={current.snapshot} />
        </section>
      </div>
      <aside className="stack dashboard-aside">
        <section className="dashboard-insight-section">
          <div className="section-heading"><h2>Da sapere</h2><Link className="text-action" href="/insights">Insights<ArrowRight size={16} /></Link></div>
          <PersonalInsightCard eyebrow="PERSONAL INTELLIGENCE" title={current.score.personalScore !== null ? `Personal Score ${current.score.personalScore}` : "Il mare incontra il tuo diario"}>
            <Sparkles size={22} />
            {similarity.similarSessions.length >= 5 ? `${similarity.similarSessions.length} sessioni simili, ${similarity.successfulSimilarSessions} produttive.` : history.length ? `${history.length} uscite concluse nel tuo storico. Registra ancora qualche sessione per riconoscere le tue condizioni migliori.` : "Servono piu sessioni per costruire i tuoi insight personali."}
          </PersonalInsightCard>
        </section>
        <DashboardSectionLinks />
      </aside>
    </div>
  </>;
}
