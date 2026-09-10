import { findBestFishingWindow, type BestFishingWindow } from "@/domain/forecast/best-window";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";
import { calculateFishingScore } from "@/domain/scoring";
import type { FishingScoreResult } from "@/domain/scoring/types";
import type { HistoricalSessionFeature } from "@/domain/personalization/types";
import type { DisciplineCode, LocationPoint, TechniqueCode } from "@/types/product";
import type { ProviderBundle } from "@/infrastructure/providers/types";

export type HourlyForecastViewModel = {
  timestamp: string;
  score: FishingScoreResult;
  snapshot: EnvironmentSnapshot;
};

export type DailyForecastViewModel = {
  date: string;
  dailyScore: number;
  bestWindow: BestFishingWindow | null;
  summary: string;
  hours: HourlyForecastViewModel[];
};

export type ForecastViewModel = {
  location: LocationPoint;
  discipline: DisciplineCode;
  technique: TechniqueCode;
  species?: string;
  generatedAt: string;
  providerLabel: string;
  bestWindow: BestFishingWindow | null;
  current: HourlyForecastViewModel;
  days: DailyForecastViewModel[];
};

export class ForecastService {
  constructor(private providers: ProviderBundle) {}

  async getForecast(input: {
    location: LocationPoint;
    discipline: DisciplineCode;
    technique: TechniqueCode;
    species?: string;
    start: string;
    days: number;
    history?: HistoricalSessionFeature[];
  }): Promise<ForecastViewModel> {
    const startDate = new Date(input.start);
    const endDate = new Date(startDate.getTime() + input.days * 24 * 60 * 60 * 1000);
    const providerRequest = {
      location: input.location,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
    const [weatherResult, marineResult] = await Promise.allSettled([
      this.providers.weather.getHourlyWeather(providerRequest),
      this.providers.marine.getHourlyMarine(providerRequest),
    ]);

    const weather = weatherResult.status === "fulfilled" ? weatherResult.value : [];
    const marine = marineResult.status === "fulfilled" ? marineResult.value : [];
    const marineByTime = new Map(marine.map((point) => [point.timestamp, point.conditions]));
    const weatherByTime = new Map(weather.map((point) => [point.timestamp, point.conditions]));
    const timestamps = Array.from(new Set([...weatherByTime.keys(), ...marineByTime.keys()])).sort();
    const depth = await this.providers.bathymetry.getDepthAtLocation(input.location);
    const fetchedAt = new Date().toISOString();

    const hours = timestamps.map((timestamp) => {
      const snapshot = buildSnapshot({
        timestamp,
        location: input.location,
        weather: weatherByTime.get(timestamp) ?? {},
        marine: { ...(marineByTime.get(timestamp) ?? {}), depthM: marineByTime.get(timestamp)?.depthM ?? depth ?? undefined },
        provider: `${this.providers.weather.name}+${this.providers.marine.name}`,
        fetchedAt,
        start: startDate,
      });
      return {
        timestamp,
        snapshot,
        score: calculateFishingScore({
          location: input.location,
          datetime: timestamp,
          discipline: input.discipline,
          technique: input.technique,
          species: input.species,
          environment: snapshot,
          userHistory: input.history,
        }),
      };
    });

    const fallbackHour = hours[0] ?? buildFallbackHour(input, startDate);
    const days = groupDays(hours);

    return {
      location: input.location,
      discipline: input.discipline,
      technique: input.technique,
      species: input.species,
      generatedAt: fetchedAt,
      providerLabel: `${this.providers.weather.name} / ${this.providers.marine.name}`,
      bestWindow: findBestFishingWindow(hours.map((hour) => ({ timestamp: hour.timestamp, score: hour.score.finalScore }))),
      current: fallbackHour,
      days,
    };
  }
}

function buildSnapshot(input: {
  timestamp: string;
  location: LocationPoint;
  weather: EnvironmentSnapshot["weather"];
  marine: EnvironmentSnapshot["marine"];
  provider: string;
  fetchedAt: string;
  start: Date;
}): EnvironmentSnapshot {
  const date = new Date(input.timestamp);
  const sunrise = new Date(date);
  sunrise.setUTCHours(4, 42, 0, 0);
  const sunset = new Date(date);
  sunset.setUTCHours(17, 38, 0, 0);
  const missingFields = missing(input.weather, input.marine);
  const totalFields = 17;
  const dataCoverage = Math.round(((totalFields - missingFields.length) / totalFields) * 100);

  return {
    timestamp: input.timestamp,
    location: input.location,
    weather: input.weather,
    marine: input.marine,
    astronomical: {
      sunrise: sunrise.toISOString(),
      sunset: sunset.toISOString(),
      isDay: date >= sunrise && date <= sunset,
    },
    derived: {
      month: date.getUTCMonth() + 1,
      minutesFromSunrise: Math.round((date.getTime() - sunrise.getTime()) / 60000),
      minutesToSunset: Math.round((sunset.getTime() - date.getTime()) / 60000),
      forecastHorizonHours: Math.max(0, Math.round((date.getTime() - input.start.getTime()) / 3600000)),
    },
    provider: input.provider,
    fetchedAt: input.fetchedAt,
    missingFields,
    dataCoverage,
  };
}

function missing(weather: EnvironmentSnapshot["weather"], marine: EnvironmentSnapshot["marine"]) {
  const required: Array<[string, unknown]> = [
    ["airTemperatureC", weather.airTemperatureC],
    ["pressureMslHpa", weather.pressureMslHpa],
    ["pressureTrend", weather.pressureTrend],
    ["windSpeedKph", weather.windSpeedKph],
    ["windDirectionDeg", weather.windDirectionDeg],
    ["windGustKph", weather.windGustKph],
    ["waveHeightM", marine.waveHeightM],
    ["waveDirectionDeg", marine.waveDirectionDeg],
    ["wavePeriodSec", marine.wavePeriodSec],
    ["swellHeightM", marine.swellHeightM],
    ["swellDirectionDeg", marine.swellDirectionDeg],
    ["swellPeriodSec", marine.swellPeriodSec],
    ["seaSurfaceTemperatureC", marine.seaSurfaceTemperatureC],
    ["oceanCurrentVelocityMps", marine.oceanCurrentVelocityMps],
    ["oceanCurrentDirectionDeg", marine.oceanCurrentDirectionDeg],
    ["seaLevelHeightM", marine.seaLevelHeightM],
    ["depthM", marine.depthM],
  ];
  return required.filter(([, value]) => value === undefined || value === null).map(([key]) => key);
}

function groupDays(hours: HourlyForecastViewModel[]) {
  const byDate = new Map<string, HourlyForecastViewModel[]>();
  for (const hour of hours) {
    const date = hour.timestamp.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), hour]);
  }

  return Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    dailyScore: Math.round(entries.reduce((sum, hour) => sum + hour.score.finalScore, 0) / entries.length),
    bestWindow: findBestFishingWindow(entries.map((hour) => ({ timestamp: hour.timestamp, score: hour.score.finalScore }))),
    summary: summarize(entries),
    hours: entries,
  }));
}

function summarize(entries: HourlyForecastViewModel[]) {
  const wave = average(entries.map((entry) => entry.snapshot.marine.waveHeightM));
  const wind = average(entries.map((entry) => entry.snapshot.weather.windSpeedKph));
  if (wave === null || wind === null) return "Dati parziali: score calcolato sui fattori disponibili.";
  return `Onda media ${wave.toFixed(1)} m, vento medio ${Math.round(wind)} km/h.`;
}

function average(values: Array<number | undefined>) {
  const available = values.filter((value): value is number => value !== undefined);
  if (!available.length) return null;
  return available.reduce((sum, value) => sum + value, 0) / available.length;
}

function buildFallbackHour(
  input: {
    location: LocationPoint;
    discipline: DisciplineCode;
    technique: TechniqueCode;
    species?: string;
    history?: HistoricalSessionFeature[];
  },
  startDate: Date,
): HourlyForecastViewModel {
  const snapshot = buildSnapshot({
    timestamp: startDate.toISOString(),
    location: input.location,
    weather: {},
    marine: {},
    provider: "fallback",
    fetchedAt: new Date().toISOString(),
    start: startDate,
  });
  return {
    timestamp: snapshot.timestamp,
    snapshot,
    score: calculateFishingScore({
      location: input.location,
      datetime: snapshot.timestamp,
      discipline: input.discipline,
      technique: input.technique,
      species: input.species,
      environment: snapshot,
      userHistory: input.history,
    }),
  };
}
