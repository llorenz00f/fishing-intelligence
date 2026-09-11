"use client";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock3, Minus } from "lucide-react";
import type { HourlyForecastViewModel } from "@/application/services/forecast-service";

export function ScoreTrend({ hours }: { hours: HourlyForecastViewModel[] }) {
  const visible = hours.slice(0, 12);
  if (visible.length < 2) return null;
  const delta = visible[visible.length - 1].score.finalScore - visible[0].score.finalScore;
  const points = visible.map((hour, i) => `${i / (visible.length - 1) * 220},${46 - hour.score.finalScore * .4}`).join(" ");
  return <div className="score-trend" data-direction={delta === 0 ? "stable" : delta > 0 ? "up" : "down"}><span>{delta === 0 ? <Minus size={16} /> : delta > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{delta === 0 ? "Stabile" : `${delta > 0 ? "+" : ""}${delta}`} · prossime {visible.length - 1}h</span><svg viewBox="0 0 220 50" role="img" aria-label="Andamento dello score nelle prossime ore"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></svg></div>;
}
export function WindowCountdown({ start, end }: { start: string; end: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  if (now === null || now > new Date(end).getTime()) return null;
  const minutes = Math.ceil((new Date(start).getTime() - now) / 60000);
  const label = minutes <= 0 ? "Finestra in corso" : minutes >= 1440 ? `Tra ${Math.floor(minutes / 1440)} giorni` : `Tra ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return <span className="countdown"><Clock3 size={14} />{label}</span>;
}
