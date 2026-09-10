import { ArrowDownRight, Check, ChevronDown } from "lucide-react";
import type { FishingScoreResult, ScoreFactorMessage } from "@/domain/scoring/types";
export function FactorBreakdown({ score }: { score: FishingScoreResult }) {
  return <section className="factor-section"><div className="section-heading"><h2>Perche questo score?</h2></div>
    <ul className="factor-list">
      {score.positiveFactors.slice(0, 3).map((factor) => <li key={factor.key}><span className="factor-check"><Check size={16} /></span><div><strong>{factor.label}</strong><p>{explain(factor, true)}</p></div></li>)}
      {score.negativeFactors.slice(0, 2).map((factor) => <li key={factor.key}><span className="factor-caution"><ArrowDownRight size={16} /></span><div><strong>{factor.label}</strong><p>{explain(factor, false)}</p></div></li>)}
    </ul>
    <details className="factor-details"><summary>Dettagli dello score<ChevronDown size={18} /></summary><div className="stack">
      {score.factorBreakdown.map((factor) => <div key={factor.key} className="factor-row"><span>{factor.label}</span><div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ "--score": factor.score } as React.CSSProperties} /></div><strong>{factor.score}</strong></div>)}
      <p className="help-text">Copertura dati {score.dataCoverage}% · Affidabilita {score.confidence}%</p>
      {score.missingFactors.length ? <p className="muted">Dati momentaneamente assenti: {score.missingFactors.map((factor) => factor.label).join(", ")}.</p> : null}
    </div></details>
  </section>;
}

function explain(factor: ScoreFactorMessage, positive: boolean) {
  const copy: Partial<Record<ScoreFactorMessage["key"], [string, string]>> = {
    waveHeight: ["Altezza delle onde favorevole alla tua tecnica.", "Onde meno adatte alla tua tecnica."],
    swellHeight: ["Il mare lungo e in linea con la tua tecnica.", "Il mare lungo puo rendere la pesca piu difficile."],
    windSpeed: ["Intensita del vento favorevole alla tua tecnica.", "Intensita del vento poco favorevole alla tua tecnica."],
    sst: ["Temperatura del mare favorevole alla specie che cerchi.", "Temperatura del mare lontana dalle condizioni preferite dalla specie."],
    current: ["Corrente favorevole alla tua tecnica.", "Corrente meno adatta alla tua tecnica."],
    pressure: ["Pressione in una fascia favorevole.", "La pressione riduce il giudizio sulle condizioni."],
    pressureTrend: ["Andamento della pressione favorevole.", "Andamento della pressione poco favorevole."],
    daylight: ["Una fascia vicina all'alba o al tramonto.", "Questa fascia e lontana dall'alba e dal tramonto."],
    season: ["Periodo favorevole per la specie selezionata.", "Periodo meno favorevole per la specie selezionata."],
    depth: ["Profondita compatibile con la tecnica.", "Profondita meno adatta alla tecnica."],
    tideProxy: ["Variazione del livello del mare favorevole.", "Variazione del livello del mare poco favorevole."],
  };
  return copy[factor.key]?.[positive ? 0 : 1] ?? factor.detail;
}
