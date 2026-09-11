import { Activity, Compass, Gauge, Sunrise, Sunset, Thermometer, Waves, Wind } from "lucide-react";
import type { ReactNode } from "react";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";
export function ConditionMetric({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon: ReactNode }) {
  return <div className="condition-metric">{icon}<span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}
export function ConditionCards({ snapshot }: { snapshot: EnvironmentSnapshot }) {
  const { marine, weather, astronomical } = snapshot;
  const direction = weather.windDirectionDeg === undefined ? "" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(weather.windDirectionDeg / 45) % 8];
  return <section className="marine-conditions" aria-label="Condizioni marine">
    <div className="sea-state">
      <div><span className="metric-label"><Waves size={20} />Mare</span><strong>{marine.waveHeightM?.toFixed(1) ?? "N/D"}<small>m</small></strong><span className="muted">Onda significativa</span></div>
      <div className="sea-secondary"><span>Periodo</span><strong>{marine.wavePeriodSec?.toFixed(0) ?? "N/D"} <small>s</small></strong><span>Swell {marine.swellHeightM?.toFixed(1) ?? "N/D"} m</span></div>
      <svg className="wave-line" viewBox="0 0 360 34" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18 Q22 0 45 18 T90 18 T135 18 T180 18 T225 18 T270 18 T315 18 T360 18" /></svg>
    </div>
    <div className="condition-list">
      <ConditionMetric label="Vento" value={weather.windSpeedKph === undefined ? "N/D" : (weather.windSpeedKph / 1.852).toFixed(0)} unit={`kn ${direction}`} icon={<Wind size={18} />} />
      <ConditionMetric label="Acqua" value={marine.seaSurfaceTemperatureC?.toFixed(1) ?? "N/D"} unit="°C" icon={<Thermometer size={18} />} />
      <ConditionMetric label="Pressione" value={weather.pressureMslHpa?.toFixed(0) ?? "N/D"} unit="hPa" icon={<Gauge size={18} />} />
      <ConditionMetric label="Corrente" value={marine.oceanCurrentVelocityMps === undefined ? "N/D" : (marine.oceanCurrentVelocityMps * 1.94384).toFixed(1)} unit="kn" icon={<Activity size={18} />} />
    </div>
    <div className="sun-times"><span><Sunrise size={18} />{formatHour(astronomical.sunrise)}</span><span className="sun-track"><Compass size={16} /></span><span><Sunset size={18} />{formatHour(astronomical.sunset)}</span></div>
  </section>;
}
function formatHour(timestamp: string) {
  return Number.isFinite(Date.parse(timestamp))
    ? new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp))
    : "N/D";
}
