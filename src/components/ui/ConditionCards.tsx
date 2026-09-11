import { Activity, Compass, Gauge, Sunrise, Sunset, Thermometer, Waves, Wind } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";
export function ConditionMetric({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon: ReactNode }) {
  return <div className="condition-metric">{icon}<span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}
export function ConditionCards({ snapshot }: { snapshot: EnvironmentSnapshot }) {
  const { marine, weather, astronomical } = snapshot;
  const direction = weather.windDirectionDeg === undefined ? "" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(weather.windDirectionDeg / 45) % 8];
  const wave = getWaveMotion(marine.waveHeightM, marine.wavePeriodSec);
  return <section className="marine-conditions" aria-label="Condizioni marine">
    <div className="sea-state">
      <div><span className="metric-label"><Waves size={20} />Mare</span><strong>{marine.waveHeightM?.toFixed(1) ?? "N/D"}<small>m</small></strong><span className="muted">Onda significativa</span></div>
      <div className="sea-secondary"><span>Periodo</span><strong>{marine.wavePeriodSec?.toFixed(0) ?? "N/D"} <small>s</small></strong><span>Swell {marine.swellHeightM?.toFixed(1) ?? "N/D"} m</span></div>
      <svg className="wave-line" data-wave-height={wave.heightLabel} data-wave-known={wave.known} style={wave.style} viewBox="0 0 360 34" preserveAspectRatio="none" aria-hidden="true">
        <path className="wave-line-trace wave-line-trace--secondary" d={wave.secondaryPath} />
        <path className="wave-line-trace" d={wave.path} />
      </svg>
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

function getWaveMotion(heightM?: number, periodSec?: number) {
  const known = Number.isFinite(heightM);
  const height = known ? Math.max(0, Math.min(heightM ?? 0, 6)) : 0;
  const amplitude = 3 + Math.min(height, 4) * 1.8;
  const wavelength = Math.max(42, 78 - height * 5);
  const period = Number.isFinite(periodSec) ? Math.max(4.5, Math.min(periodSec ?? 6, 13)) : 6;
  return {
    known,
    heightLabel: known ? height.toFixed(1) : "N/D",
    path: buildWavePath(amplitude, wavelength, 18),
    secondaryPath: buildWavePath(amplitude * .62, wavelength * 1.18, 24),
    style: {
      "--wave-speed": `${period * .9}s`,
      "--wave-lift": `${Math.min(10, height * 1.6)}px`,
    } as CSSProperties,
  };
}

function buildWavePath(amplitude: number, wavelength: number, baseline: number) {
  const halfWave = wavelength / 2;
  let path = `M 0 ${baseline}`;
  let x = 0;
  let crest = true;
  while (x < 360) {
    const next = Math.min(360, x + halfWave);
    const controlX = x + (next - x) / 2;
    path += ` Q ${controlX.toFixed(1)} ${(baseline + (crest ? -amplitude : amplitude)).toFixed(1)} ${next.toFixed(1)} ${baseline}`;
    x = next;
    crest = !crest;
  }
  return path;
}
function formatHour(timestamp: string) {
  return Number.isFinite(Date.parse(timestamp))
    ? new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp))
    : "N/D";
}
