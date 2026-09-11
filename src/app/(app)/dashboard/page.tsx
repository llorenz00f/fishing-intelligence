import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { MobileHeader } from "@/components/app/MobileHeader";
import { ConditionCards } from "@/components/ui/ConditionCards";
import { FactorBreakdown } from "@/components/forecast/FactorBreakdown";
import { ScoreHero } from "@/components/forecast/ScoreCard";
import { ScoreTrend, WindowCountdown } from "@/components/forecast/ScoreTrend";
import { PersonalInsightCard } from "@/components/ui/ProductPrimitives";
import { SessionCard } from "@/components/sessions/SessionCard";
import { getDemoForecast, demoSessions, demoHistory } from "@/data/demo";
import { labelForSpecies, labelForTechnique } from "@/data/catalog";
import { calculateSimilarity } from "@/domain/personalization/similarity";
import { ForecastThemeBridge } from "@/components/appearance/ThemeProvider";
import { getForecastLocation } from "@/infrastructure/repositories/forecast-location";
import { ForecastLocation } from "@/components/forecast/ForecastLocation";
import { LocalTime } from "@/components/ui/LocalTime";

export default async function DashboardPage() {
  await connection();
  const forecast = await getDemoForecast(await getForecastLocation());
  const current = forecast.current;
  const location = forecast.location.label ?? "Area selezionata";
  const today = forecast.days.find(day => day.date === current.timestamp.slice(0, 10));
  const bestWindow = today?.bestWindow;
  const windowLabel = bestWindow ? <><LocalTime timestamp={bestWindow.start} /> – <LocalTime timestamp={bestWindow.end} /></> : "Non disponibile";
  const similarity = calculateSimilarity({ discipline: forecast.discipline, technique: forecast.technique, species: forecast.species, environment: current.snapshot, history: demoHistory });
  return <>
    <ForecastThemeBridge forecast={forecast} />
    <MobileHeader title="Il tuo mare, oggi." location={location} refresh />
    <ForecastLocation location={forecast.location} autoRefresh />
    <div className="dashboard-grid">
      <div className="stack">
        <ScoreHero title="OGGI, PER TE" score={current.score} location={location} technique={labelForTechnique(forecast.technique)} species={labelForSpecies(forecast.species)} window={windowLabel}
          cta={<Link className="primary-action hero-cta" href="/sessions/new"><Play size={17} />Inizia sessione<ArrowRight size={17} /></Link>}>
          <ScoreTrend hours={today?.hours ?? [current]} />
          {bestWindow ? <WindowCountdown start={bestWindow.start} end={bestWindow.end} /> : null}
        </ScoreHero>
        <div className="section-heading"><h2>Il mare adesso</h2><span className="help-text"><LocalTime timestamp={current.timestamp} /></span></div>
        <ConditionCards snapshot={current.snapshot} />
        <FactorBreakdown score={current.score} />
      </div>
      <aside className="stack dashboard-aside">
        <PersonalInsightCard eyebrow="PERSONAL INTELLIGENCE" title={current.score.personalScore !== null ? `Personal Score ${current.score.personalScore}` : "Il mare incontra il tuo diario"}>
          <Sparkles size={22} />
          {similarity.similarSessions.length >= 5 ? `${similarity.similarSessions.length} sessioni simili, ${similarity.successfulSimilarSessions} produttive. Le tue uscite danno piu contesto alle condizioni di oggi.` : `${demoHistory.length} uscite nel tuo storico. Registra ancora qualche sessione per riconoscere le tue condizioni migliori.`}
        </PersonalInsightCard>
        <section><div className="section-heading"><h2>I prossimi giorni</h2><Link className="text-action" href="/forecast">Tutti<ArrowRight size={16} /></Link></div>
          <div className="next-days">{forecast.days.slice(0, 4).map(day => <Link href="/forecast" className="next-day" key={day.date}><span>{new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric" }).format(new Date(day.date))}</span><strong>{day.dailyScore}</strong><small>{day.bestWindow ? <LocalTime timestamp={day.bestWindow.start} /> : "N/D"}</small></Link>)}</div>
        </section>
        <Link href="/map" className="explore-banner"><div><span className="eyebrow">I TUOI SPOT</span><h2>La prossima uscita<br />parte da qui.</h2></div><span className="round-arrow"><ArrowRight size={22} /></span></Link>
        <section><div className="section-heading"><h2>Dal tuo diario</h2><Link className="text-action" href="/sessions">Tutto<ArrowRight size={16} /></Link></div><div className="stack">{demoSessions.slice(0, 2).map(session => <SessionCard session={session} compact key={session.id} />)}</div></section>
      </aside>
    </div>
  </>;
}
