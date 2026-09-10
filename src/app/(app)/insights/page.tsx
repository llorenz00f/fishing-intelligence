import Link from "next/link";
import { ArrowRight, Sparkles, Sunrise, Thermometer, Waves } from "lucide-react";
import { MobileHeader } from "@/components/app/MobileHeader";
import { buildDataDrivenInsights, buildInsightKpis } from "@/domain/personalization/insights";
import { demoHistory } from "@/data/demo";
import { PersonalInsightCard, StatCard } from "@/components/ui/ProductPrimitives";
import type { CSSProperties } from "react";

export default function InsightsPage() {
  const kpis = buildInsightKpis(demoHistory);
  const insights = buildDataDrivenInsights(demoHistory);
  const dawn = demoHistory.filter(session => Math.abs(session.timeOfDayMinutes - 360) <= 90);
  const other = demoHistory.filter(session => Math.abs(session.timeOfDayMinutes - 360) > 90);
  const dawnRate = buildInsightKpis(dawn).activityRate;
  const otherRate = buildInsightKpis(other).activityRate;
  return <>
    <MobileHeader title="Il mare, a modo tuo." />
    <div className="dashboard-grid">
      <div className="stack">
        <section className="insight-summary"><p className="eyebrow">PERSONAL INTELLIGENCE</p><h2>Ogni uscita racconta qualcosa.</h2><strong>{kpis.activityRate}%</strong><p className="muted">delle tue sessioni ha registrato catture o abboccate.</p><p className="help-text">Basato su {kpis.totalSessions} uscite · {kpis.totalHours} ore in pesca</p></section>
        <section><div className="section-heading"><h2>Il tuo momento migliore</h2><Sunrise size={22} /></div>
          <div className="insight-chart" role="img" aria-label={`Uscite attive all'alba: ${dawnRate}% su ${dawn.length} uscite. Altri orari: ${otherRate}% su ${other.length} uscite.`}>
            <div className="insight-bar-row"><span>Alba</span><div className="bar-track"><div className="bar-fill" style={{ "--score": dawnRate } as CSSProperties} /></div><strong>{dawnRate}%</strong></div>
            <div className="insight-bar-row"><span>Altri orari</span><div className="bar-track"><div className="bar-fill" style={{ "--score": otherRate } as CSSProperties} /></div><strong>{otherRate}%</strong></div>
          </div><p className="help-text" style={{ marginTop: "var(--space-3)" }}>{dawn.length} uscite all&apos;alba, {other.length} in altri orari. Percentuale di sessioni con attivita.</p>
        </section>
        <div className="insight-grid">{insights.map((insight, index) => <PersonalInsightCard key={insight.title} eyebrow={`${insight.sampleSize} USCITE ANALIZZATE`} title={index === 0 ? "L'alba torna nel tuo diario" : index === 1 ? "Quando il mare si muove" : "La temperatura che ritrovi"}>
          {index === 0 ? <Sunrise size={23} /> : index === 1 ? <Waves size={23} /> : <Thermometer size={23} />}
          {insight.detail.replace("activity rate", "uscite attive al").replace("SST", "temperatura del mare").replaceAll(" C", " °C")}
        </PersonalInsightCard>)}</div>
      </div>
      <aside className="stack">
        <section className="insight-progress"><Sparkles size={24} /><h2>Il tuo profilo sta crescendo.</h2><p className="muted">{demoHistory.length} uscite registrate. Piu condizioni diverse incontri, piu diventa utile il confronto con il tuo storico.</p><div className="bar-track"><div className="bar-fill" style={{ "--score": Math.min(100, demoHistory.length / 20 * 100) } as CSSProperties} /></div><span className="help-text">{demoHistory.length} / 20 uscite</span><Link className="text-action" href="/sessions/new">Aggiungi un&apos;uscita<ArrowRight size={17} /></Link></section>
        <section><div className="section-heading"><h2>Il tuo bilancio</h2></div><div className="grid-2"><StatCard label="Catture" value={kpis.catches} /><StatCard label="Abboccate" value={kpis.strikes} /><StatCard label="Catture / ora" value={kpis.catchPerHour} /><StatCard label="Uscite con catture" value={`${kpis.successRate}%`} /></div></section>
      </aside>
    </div>
  </>;
}
