import { z } from "zod";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";

/** Stable state keys shared with the appearance registry. */
export type WeatherState =
  | "neutral"
  | "clear-day"
  | "clear-night"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "fog"
  | "windy"
  | "sunrise"
  | "sunset";

/** Semantic palette keys, independent of CSS or a user's light/dark setting. */
export type WeatherColorVariant =
  | "neutral" | "day" | "night" | "overcast" | "rain" | "storm" | "mist" | "dawn" | "dusk";

/** Declarative effect names; rendering and reduced-motion policy belong to the UI. */
export type AmbientEffect = "sun-glow" | "stars" | "clouds" | "rain" | "lightning" | "fog" | "wind";

/** Twilight describes the evaluation instant, including during adverse weather. */
export type WeatherTimeOfDay = "unknown" | "day" | "night" | "sunrise" | "sunset";

/** Serializable, immutable appearance decisions. Intensity is normalized to 0..1. */
export type WeatherTheme = Readonly<{
  weatherState: WeatherState;
  colorVariant: WeatherColorVariant;
  ambientEffects: readonly AmbientEffect[];
  intensity: number;
  timeOfDay: WeatherTimeOfDay;
}>;

const minuteMs = 60_000;
const dayMs = 24 * 60 * minuteMs;
const twilightMs = 45 * minuteMs;
const isoInstant = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.datetime({ offset: true, precision: -1 }),
]);

// WMO mappings: https://open-meteo.com/en/docs#weathervariables
const thunderCodes = new Set([95, 96, 99]);
const heavyRainCodes = new Set([65, 67, 82]);
const rainCodes = new Set([51, 53, 55, 56, 57, 61, 63, 66, 80, 81]);
const snowCodes = new Set([71, 73, 75, 77, 85, 86]);
const fogCodes = new Set([45, 48]);
const knownCodes = new Set([0, 1, 2, 3, ...thunderCodes, ...heavyRainCodes, ...rainCodes, ...snowCodes, ...fogCodes]);

function theme(
  weatherState: WeatherState,
  colorVariant: WeatherColorVariant,
  ambientEffects: AmbientEffect[],
  intensity: number,
  timeOfDay: WeatherTimeOfDay,
): WeatherTheme {
  return { weatherState, colorVariant, ambientEffects, intensity: Math.max(0, Math.min(1, intensity)), timeOfDay };
}

function neutral(): WeatherTheme {
  return theme("neutral", "neutral", [], 0, "unknown");
}

function validOptionalNumber(value: unknown, maximum = Infinity): boolean {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum);
}

function timeOfDayAt(
  astronomical: EnvironmentSnapshot["astronomical"] | null | undefined,
  now: Date,
): WeatherTimeOfDay {
  if (!astronomical || typeof astronomical.isDay !== "boolean" || !(now instanceof Date)) return "unknown";
  if (!isoInstant.safeParse(astronomical.sunrise).success || !isoInstant.safeParse(astronomical.sunset).success) return "unknown";

  const sunrise = Date.parse(astronomical.sunrise);
  const sunset = Date.parse(astronomical.sunset);
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp) || sunset <= sunrise || sunset - sunrise >= dayMs) return "unknown";
  if (timestamp < sunrise - dayMs || timestamp > sunset + dayMs) return "unknown";

  const fromSunrise = Math.abs(timestamp - sunrise);
  const fromSunset = Math.abs(timestamp - sunset);
  if (fromSunrise <= twilightMs && fromSunrise <= fromSunset) return "sunrise";
  if (fromSunset <= twilightMs) return "sunset";
  return timestamp > sunrise && timestamp < sunset ? "day" : "night";
}

/**
 * Resolve only supplied snapshot data: no I/O, browser state, mutation or clock reads.
 * Pass snapshot.weather, snapshot.astronomical and the explicit evaluation Date.
 * The caller selects a snapshot within 90 minutes of now and passes null for stale
 * or unavailable weather; WeatherConditions itself carries no freshness metadata.
 * Missing/invalid astronomy, an invalid Date or invalid supplied classification
 * fields returns neutral. An absent code is supported via rain/cloud/wind values.
 *
 * Precedence: thunderstorm > snow (cloudy) > heavy rain > rain > fog > wind >
 * overcast > twilight > partly cloudy > clear. Snow has no state in this contract
 * and uses clouds without rain effects; total precipitation can include snow.
 * Rain starts at 0.1 mm/hour, heavy rain at 7.5 mm/hour; wind at 30 km/h sustained
 * or 45 km/h gusts. Cloud bands are <25%, 25..<80%, and >=80%. WMO adverse codes
 * remain authoritative when measured precipitation is absent or zero.
 * Sunrise/sunset windows include both +/-45-minute boundaries. Overlapping
 * windows use the closer event, with sunrise winning ties. Actual instants take
 * precedence over the snapshot's isDay flag because now can cross an hourly edge.
 */
export function resolveWeatherTheme(
  weatherData: EnvironmentSnapshot["weather"] | null | undefined,
  astronomicalData: EnvironmentSnapshot["astronomical"] | null | undefined,
  now: Date,
): WeatherTheme {
  if (!weatherData) return neutral();
  const timeOfDay = timeOfDayAt(astronomicalData, now);
  if (timeOfDay === "unknown") return neutral();

  const { weatherCode, cloudCoverPct, precipitationMm, windSpeedKph, windGustKph } = weatherData;
  if (
    (weatherCode !== undefined && !knownCodes.has(weatherCode)) ||
    !validOptionalNumber(cloudCoverPct, 100) ||
    !validOptionalNumber(precipitationMm) ||
    !validOptionalNumber(windSpeedKph) ||
    !validOptionalNumber(windGustKph)
  ) return neutral();

  const code = weatherCode ?? -1;
  const precipitation = precipitationMm ?? 0;
  const wind = windSpeedKph ?? 0;
  const gust = windGustKph ?? 0;
  const windEffects: AmbientEffect[] = wind >= 30 || gust >= 45 ? ["wind"] : [];

  if (thunderCodes.has(code)) {
    return theme("thunderstorm", "storm", ["clouds", "rain", "lightning", ...windEffects], code === 99 ? 1 : 0.8, timeOfDay);
  }
  if (snowCodes.has(code)) return theme("cloudy", "overcast", ["clouds", ...windEffects], 0.65, timeOfDay);
  if (heavyRainCodes.has(code) || precipitation >= 7.5) {
    return theme("heavy-rain", "rain", ["clouds", "rain", ...windEffects], Math.max(0.7, precipitation / 15), timeOfDay);
  }
  if (rainCodes.has(code) || precipitation >= 0.1) {
    return theme("rain", "rain", ["clouds", "rain", ...windEffects], 0.25 + (precipitation / 7.5) * 0.35, timeOfDay);
  }
  if (fogCodes.has(code)) return theme("fog", "mist", ["fog", ...windEffects], code === 48 ? 0.65 : 0.45, timeOfDay);
  if (windEffects.length) {
    return theme("windy", "overcast", ["wind", "clouds"], Math.max(wind / 70, gust / 100), timeOfDay);
  }
  if (code === 3 || (cloudCoverPct !== undefined && cloudCoverPct >= 80)) {
    return theme("cloudy", "overcast", ["clouds"], Math.max(0.6, (cloudCoverPct ?? 80) / 100), timeOfDay);
  }

  const hasSkyData = code === 0 || code === 1 || code === 2 || cloudCoverPct !== undefined;
  if (!hasSkyData) return neutral();
  const partlyCloudy = code === 2 || (cloudCoverPct !== undefined && cloudCoverPct >= 25);
  if (timeOfDay === "sunrise" || timeOfDay === "sunset") {
    return theme(timeOfDay, timeOfDay === "sunrise" ? "dawn" : "dusk", ["sun-glow", ...(partlyCloudy ? ["clouds" as const] : [])], 0.5, timeOfDay);
  }
  if (partlyCloudy) {
    return theme("partly-cloudy", timeOfDay, ["clouds"], Math.max(0.25, (cloudCoverPct ?? 40) / 100), timeOfDay);
  }
  return timeOfDay === "day"
    ? theme("clear-day", "day", ["sun-glow"], 0.3, timeOfDay)
    : theme("clear-night", "night", ["stars"], 0.2, timeOfDay);
}
