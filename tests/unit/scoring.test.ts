import { describe, expect, it } from "vitest";
import { calculateFishingScore } from "@/domain/scoring";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";
import type { HistoricalSessionFeature } from "@/domain/personalization/types";

const environment: EnvironmentSnapshot = {
  timestamp: "2026-11-12T06:00:00.000Z",
  location: { latitude: 42.76, longitude: 10.88 },
  weather: {
    pressureMslHpa: 1018,
    pressureTrend: "STABLE",
    windSpeedKph: 12,
    windDirectionDeg: 250,
    windGustKph: 19,
  },
  marine: {
    waveHeightM: 0.7,
    waveDirectionDeg: 250,
    swellHeightM: 0.4,
    seaSurfaceTemperatureC: 18,
    oceanCurrentVelocityMps: 0.24,
    oceanCurrentDirectionDeg: 180,
    seaLevelHeightM: 0.12,
    depthM: 17,
  },
  astronomical: {
    sunrise: "2026-11-12T05:15:00.000Z",
    sunset: "2026-11-12T16:55:00.000Z",
    isDay: true,
  },
  derived: {
    month: 11,
    minutesFromSunrise: 45,
    minutesToSunset: 655,
    forecastHorizonHours: 5,
  },
  provider: "test",
  fetchedAt: "2026-11-11T12:00:00.000Z",
  missingFields: [],
  dataCoverage: 100,
};

describe("calculateFishingScore", () => {
  it("returns deterministic scores between 0 and 100", () => {
    const input = {
      location: environment.location,
      datetime: environment.timestamp,
      discipline: "SHORE_SPINNING" as const,
      technique: "SHORE_SPINNING" as const,
      species: "SPIGOLA",
      environment,
    };
    const first = calculateFishingScore(input);
    const second = calculateFishingScore(input);

    expect(first.finalScore).toBeGreaterThanOrEqual(0);
    expect(first.finalScore).toBeLessThanOrEqual(100);
    expect(first).toEqual(second);
  });

  it("renormalizes available weights instead of treating missing data as zero", () => {
    const partialEnvironment: EnvironmentSnapshot = {
      ...environment,
      marine: {
        waveHeightM: 0.7,
      },
      weather: {},
    };
    const result = calculateFishingScore({
      location: partialEnvironment.location,
      datetime: partialEnvironment.timestamp,
      discipline: "SHORE_SPINNING",
      technique: "SHORE_SPINNING",
      species: "SPIGOLA",
      environment: partialEnvironment,
    });

    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.missingFactors.length).toBeGreaterThan(0);
    expect(result.factorBreakdown.every((factor) => factor.score >= 0)).toBe(true);
  });

  it("keeps safety warnings separate from the fishing score", () => {
    const result = calculateFishingScore({
      location: environment.location,
      datetime: environment.timestamp,
      discipline: "BOAT",
      technique: "DRIFTING",
      species: "TONNO_ROSSO",
      environment: {
        ...environment,
        marine: { ...environment.marine, waveHeightM: 1.6 },
        weather: { ...environment.weather, windSpeedKph: 28 },
      },
    });

    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.safetyWarnings.length).toBeGreaterThan(0);
    expect(result.safety.suppressGoCta).toBe(true);
  });

  it("uses personal score only after enough comparable history", () => {
    const history: HistoricalSessionFeature[] = Array.from({ length: 12 }).map((_, index) => ({
      id: `h-${index}`,
      discipline: "SHORE_SPINNING",
      technique: "SHORE_SPINNING",
      species: "SPIGOLA",
      month: 11,
      timeOfDayMinutes: 360 + index,
      windSpeedKph: 12,
      windDirectionDeg: 250,
      waveHeightM: 0.7,
      waveDirectionDeg: 250,
      swellHeightM: 0.4,
      seaSurfaceTemperatureC: 18,
      currentVelocityMps: 0.24,
      currentDirectionDeg: 180,
      pressureMslHpa: 1018,
      pressureTrend: "STABLE",
      seaLevelHeightM: 0.12,
      depthM: 17,
      durationMinutes: 120,
      outcome: { catches: 2, strikes: 3, rating: 5 },
    }));

    const result = calculateFishingScore({
      location: environment.location,
      datetime: environment.timestamp,
      discipline: "SHORE_SPINNING",
      technique: "SHORE_SPINNING",
      species: "SPIGOLA",
      environment,
      userHistory: history,
    });

    expect(result.personalScore).not.toBeNull();
    expect(result.positiveFactors.some((factor) => factor.key === "history")).toBe(true);
  });
});
