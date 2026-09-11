import { Activity, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Compass, Droplets, Gauge, Moon, Sun, Sunrise, Sunset, Thermometer, Waves, Wind } from "lucide-react";
import type { ReactNode } from "react";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";
import { resolveWeatherTheme } from "@/domain/appearance/weather";
import { MarineWave } from "./MarineWave";
import { LocalTime } from "./LocalTime";
export function ConditionMetric({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon: ReactNode }) {
  return <div className="condition-metric">{icon}<span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}
export function WeatherObservation({ snapshot, current = false }: { snapshot: EnvironmentSnapshot; current?: boolean }) {
  const { weather, astronomical } = snapshot;
  const sky = resolveWeatherTheme(weather, astronomical, new Date(snapshot.timestamp));
  const labels = { neutral: "Meteo non disponibile", "clear-day": "Sereno", "clear-night": "Sereno", "partly-cloudy": "Parzialmente nuvoloso", cloudy: "Nuvoloso", rain: "Pioggia", "heavy-rain": "Pioggia intensa", thunderstorm: "Temporale", fog: "Foschia", windy: "Ventoso", sunrise: "Sereno all'alba", sunset: "Sereno al tramonto" };
  const icons = { neutral: Cloud, "clear-day": Sun, "clear-night": Moon, "partly-cloudy": CloudSun, cloudy: Cloud, rain: CloudRain, "heavy-rain": CloudRain, thunderstorm: CloudLightning, fog: CloudFog, windy: Wind, sunrise: Sunrise, sunset: Sunset };
  const Icon = icons[sky.weatherState];
  const source = /mock/i.test(snapshot.provider) ? "Dati dimostrativi" : /fallback/i.test(snapshot.provider) ? "Dati non disponibili" : "Open-Meteo";
  return <div className={`weather-observation${current ? " weather-current" : ""}`} data-weather={sky.weatherState}>
    <div>{current ? <span className="metric-label">Adesso</span> : null}<Icon size={19} /><strong>{labels[sky.weatherState]}</strong><span>{weather.airTemperatureC?.toFixed(1) ?? "N/D"} °C</span></div>
    <div><Droplets size={15} /><span>Precipitazioni {weather.precipitationMm?.toFixed(1) ?? "N/D"} mm</span></div>
    <small>{source} · <LocalTime timestamp={snapshot.timestamp} /></small>
  </div>;
}
export function ConditionCards({ snapshot }: { snapshot: EnvironmentSnapshot }) {
  const { marine, weather, astronomical } = snapshot;
  const direction = weather.windDirectionDeg === undefined ? "" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(weather.windDirectionDeg / 45) % 8];
  return <section className="marine-conditions" aria-label="Condizioni marine">
    <WeatherObservation snapshot={snapshot} />
    <div className="sea-state">
      <div><span className="metric-label"><Waves size={20} />Mare</span><strong>{marine.waveHeightM?.toFixed(1) ?? "N/D"}<small>m</small></strong><span className="muted">Onda significativa</span></div>
      <div className="sea-secondary"><span>Periodo</span><strong>{marine.wavePeriodSec?.toFixed(0) ?? "N/D"} <small>s</small></strong><span>Swell {marine.swellHeightM?.toFixed(1) ?? "N/D"} m</span></div>
      <MarineWave heightM={marine.waveHeightM} periodSec={marine.wavePeriodSec} />
    </div>
    <div className="condition-list">
      <ConditionMetric label="Vento" value={weather.windSpeedKph === undefined ? "N/D" : (weather.windSpeedKph / 1.852).toFixed(0)} unit={`kn ${direction}`} icon={<Wind size={18} />} />
      <ConditionMetric label="Acqua" value={marine.seaSurfaceTemperatureC?.toFixed(1) ?? "N/D"} unit="°C" icon={<Thermometer size={18} />} />
      <ConditionMetric label="Pressione" value={weather.pressureMslHpa?.toFixed(0) ?? "N/D"} unit="hPa" icon={<Gauge size={18} />} />
      <ConditionMetric label="Corrente" value={marine.oceanCurrentVelocityMps === undefined ? "N/D" : (marine.oceanCurrentVelocityMps * 1.94384).toFixed(1)} unit="kn" icon={<Activity size={18} />} />
    </div>
    <div className="sun-times"><span><Sunrise size={18} /><LocalTime timestamp={astronomical.sunrise} /></span><span className="sun-track"><Compass size={16} /></span><span><Sunset size={18} /><LocalTime timestamp={astronomical.sunset} /></span></div>
  </section>;
}
