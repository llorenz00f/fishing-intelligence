import { ChevronDown, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Gauge, Moon, Sun, Thermometer, Waves, Wind } from "lucide-react";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";
import { resolveWeatherTheme } from "@/domain/appearance/weather";
import { ConditionMetric } from "./ConditionCards";
import { LocalTime } from "./LocalTime";

const weatherLabels = {
  neutral: "Meteo non disponibile", "clear-day": "Sereno", "clear-night": "Sereno", "partly-cloudy": "Parzialmente nuvoloso",
  cloudy: "Nuvoloso", rain: "Pioggia", "heavy-rain": "Pioggia intensa", thunderstorm: "Temporale", fog: "Foschia",
  windy: "Ventoso", sunrise: "Sereno all'alba", sunset: "Sereno al tramonto",
} as const;
const weatherIcons = { neutral: Cloud, "clear-day": Sun, "clear-night": Moon, "partly-cloudy": CloudSun, cloudy: Cloud, rain: CloudRain, "heavy-rain": CloudRain, thunderstorm: CloudLightning, fog: CloudFog, windy: Wind, sunrise: Sun, sunset: Sun } as const;

export function EssentialConditions({ snapshot }: { snapshot: EnvironmentSnapshot }) {
  const { weather, marine, astronomical } = snapshot;
  const sky = resolveWeatherTheme(weather, astronomical, new Date(snapshot.timestamp));
  const SkyIcon = weatherIcons[sky.weatherState];
  const direction = weather.windDirectionDeg === undefined ? "" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(weather.windDirectionDeg / 45) % 8];
  const source = /mock/i.test(snapshot.provider) ? "Dati dimostrativi" : /fallback/i.test(snapshot.provider) ? "Dati non disponibili" : "Open-Meteo";

  return <section className="essential-conditions" data-weather={sky.weatherState} aria-label="Condizioni essenziali">
    <div className="essential-weather-line">
      <span className="essential-weather-status"><SkyIcon size={19} /><strong>{weatherLabels[sky.weatherState]}</strong></span>
      <span>{weather.airTemperatureC?.toFixed(1) ?? "N/D"} °C</span>
      <span>{weather.precipitationMm && weather.precipitationMm > 0 ? `Pioggia ${weather.precipitationMm.toFixed(1)} mm` : "Nessuna pioggia"}</span>
      <small>{source} · <LocalTime timestamp={snapshot.timestamp} /></small>
    </div>
    <div className="essential-metrics">
      <ConditionMetric label="Vento" value={weather.windSpeedKph === undefined ? "N/D" : (weather.windSpeedKph / 1.852).toFixed(0)} unit={`kn ${direction}`} icon={<Wind size={18} />} />
      <ConditionMetric label="Onda" value={marine.waveHeightM?.toFixed(1) ?? "N/D"} unit="m" icon={<Waves size={18} />} />
      <ConditionMetric label="Acqua" value={marine.seaSurfaceTemperatureC?.toFixed(1) ?? "N/D"} unit="°C" icon={<Thermometer size={18} />} />
      <ConditionMetric label="Pressione" value={weather.pressureMslHpa?.toFixed(0) ?? "N/D"} unit="hPa" icon={<Gauge size={18} />} />
    </div>
    <details className="essential-details">
      <summary><span>Vedi tutte le condizioni</span><ChevronDown size={17} /></summary>
      <div className="essential-detail-grid">
        <span>Periodo onda <strong>{marine.wavePeriodSec?.toFixed(0) ?? "N/D"} s</strong></span>
        <span>Swell <strong>{marine.swellHeightM?.toFixed(1) ?? "N/D"} m</strong></span>
        <span>Raffiche <strong>{weather.windGustKph?.toFixed(0) ?? "N/D"} km/h</strong></span>
        <span>Corrente <strong>{marine.oceanCurrentVelocityMps === undefined ? "N/D" : `${(marine.oceanCurrentVelocityMps * 1.94384).toFixed(1)} kn`}</strong></span>
        <span>Alba <strong><LocalTime timestamp={astronomical.sunrise} /></strong></span>
        <span>Tramonto <strong><LocalTime timestamp={astronomical.sunset} /></strong></span>
      </div>
    </details>
  </section>;
}
