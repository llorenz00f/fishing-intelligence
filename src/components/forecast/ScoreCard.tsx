import type { CSSProperties, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { BestFishingWindow } from "@/components/ui/ProductPrimitives";
import type { FishingScoreResult } from "@/domain/scoring/types";
export function scoreLabel(score: number) {
  if (score >= 90) return "Eccellente";
  if (score >= 75) return "Molto favorevole";
  if (score >= 60) return "Buono";
  if (score >= 40) return "Discreto";
  return "Poco favorevole";
}
export function ScoreRing({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, score));
  return <div className="score-ring" role="img" aria-label={`Fishing Score ${value} su 100`} style={{ "--score": value } as CSSProperties}>
    <svg viewBox="0 0 180 180" aria-hidden="true"><circle className="ring-track" cx="90" cy="90" r="78" /><circle className="ring-value" cx="90" cy="90" r="78" pathLength="100" strokeDasharray={`${value} 100`} /></svg>
    <div><strong>{value}</strong><span>FISHING SCORE</span></div>
  </div>;
}
export function ScoreHero({ title, score, location, technique, species, window, cta, children }: {
  title: string; score: FishingScoreResult; location: string; technique: string; species: string; window: string; cta?: ReactNode; children?: ReactNode;
}) {
  return <section className="score-hero" aria-label={title}>
    <div className="hero-overline"><span>{title}</span><span className="confidence"><ShieldCheck size={14} />{score.confidence}% affidabilita</span></div>
    <div className="score-stage">
      <ScoreRing score={score.finalScore} />
      <div className="score-verdict"><h2>{scoreLabel(score.finalScore)}</h2><p>{technique} · {species}</p><span className="score-location">{location}</span></div>
    </div>
    {children}
    <BestFishingWindow window={window} />
    {score.safetyWarnings.length ? <p className="form-message">{score.safetyWarnings[0]}</p> : null}
    {cta}
  </section>;
}
export function ScoreCard({ title, score, subtitle, cta }: { title: string; score: FishingScoreResult; subtitle?: string; cta?: ReactNode }) {
  return <section className="score-card" aria-label={title}><div className="score-main"><ScoreRing score={score.finalScore} /><div className="score-copy"><p className="eyebrow">{title}</p><h2>{scoreLabel(score.finalScore)}</h2>{subtitle ? <p className="muted">{subtitle}</p> : null}<p className="muted">Affidabilita {score.confidence}%</p></div></div>{cta}</section>;
}
