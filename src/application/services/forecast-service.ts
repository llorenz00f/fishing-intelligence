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
    const weatherByTime = new Map(weather.filter(point => !point.isCurrent).map((point) => [point.timestamp, point]));
    const timestamps = Array.from(new Set([...weatherByTime.keys(), ...marineByTime.keys()])).sort();
    const depth = await this.providers.bathymetry.getDepthAtLocation(input.location);
    const fetchedAt = new Date().toISOString();

    const hours = timestamps.map((timestamp) => {
      const snapshot = buildSnapshot({
        timestamp,
        location: input.location,
        weather: weatherByTime.get(timestamp)?.conditions ?? {},
        astronomical: weatherByTime.get(timestamp)?.astronomical,
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

    const preceding = hours.filter(hour => hour.timestamp <= input.start).at(-1);
    const closest = preceding ?? hours[0];
    let current = closest && Math.abs(Date.parse(closest.timestamp) - startDate.getTime()) <= 90 * 60_000
      ? closest : buildFallbackHour(input, startDate);
    const live = weather.find(point => point.isCurrent && Math.abs(Date.parse(point.timestamp) - startDate.getTime()) <= 90 * 60_000);
    if (live) {
      const snapshot = buildSnapshot({ timestamp: live.timestamp, location: input.location, weather: live.conditions, astronomical: live.astronomical,
        marine: current.snapshot.marine, provider: `${this.providers.weather.name}+${this.providers.marine.name}`, fetchedAt, start: startDate });
      current = { timestamp: snapshot.timestamp, snapshot, score: calculateFishingScore({ location: input.location, datetime: snapshot.timestamp,
        discipline: input.discipline, technique: input.technique, species: input.species, environment: snapshot, userHistory: input.history }) };
    }
    const days = groupDays(hours);

    return {
      location: input.location,
      discipline: input.discipline,
      technique: input.technique,
      species: input.species,
      generatedAt: fetchedAt,
      providerLabel: `${this.providers.weather.name} / ${this.providers.marine.name}`,
      bestWindow: findBestFishingWindow(hours.map((hour) => ({ timestamp: hour.timestamp, score: hour.score.finalScore }))),
      current,
      days,
    };
  }
}

function buildSnapshot(input: {
  timestamp: string;
  location: LocationPoint;
  weather: EnvironmentSnapshot["weather"];
  astronomical?: EnvironmentSnapshot["astronomical"];
  marine: EnvironmentSnapshot["marine"];
  provider: string;
  fetchedAt: string;
  start: Date;
}): EnvironmentSnapshot {
  const date = new Date(input.timestamp);
  const astronomical = input.astronomical ?? { sunrise: "", sunset: "", isDay: false };
  const sunrise = Date.parse(astronomical.sunrise);
  const sunset = Date.parse(astronomical.sunset);
  const hasSolarEvents = Number.isFinite(sunrise) && Number.isFinite(sunset) && sunrise < sunset;
  const missingFields = missing(input.weather, input.marine);
  const totalFields = 17;
  const dataCoverage = Math.round(((totalFields - missingFields.length) / totalFields) * 100);

  return {
    timestamp: input.timestamp,
    location: input.location,
    weather: input.weather,
    marine: input.marine,
    astronomical,
    derived: {
      month: date.getUTCMonth() + 1,
      minutesFromSunrise: hasSolarEvents ? Math.round((date.getTime() - sunrise) / 60000) : undefined,
      minutesToSunset: hasSolarEvents ? Math.round((sunset - date.getTime()) / 60000) : undefined,
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
