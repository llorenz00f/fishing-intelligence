import { Moon, Sun } from "lucide-react";
import type { HourlyForecastViewModel } from "@/application/services/forecast-service";
export function ForecastTimeline({ hours, timestamp, onSelect }: { hours: HourlyForecastViewModel[]; timestamp: string; onSelect: (timestamp: string) => void }) {
  return <div className="forecast-timeline" aria-label="Previsioni orarie">{hours.map(hour => <button className="timeline-card" key={hour.timestamp} data-selected={hour.timestamp === timestamp} aria-pressed={hour.timestamp === timestamp} onClick={() => onSelect(hour.timestamp)}>
    <time dateTime={hour.timestamp}>{new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(hour.timestamp))}</time>
    {hour.snapshot.astronomical.isDay ? <Sun size={20} /> : <Moon size={20} />}<strong>{hour.score.finalScore}</strong><span>{hour.snapshot.marine.waveHeightM?.toFixed(1) ?? "N/D"} m</span>
  </button>)}</div>;
}
