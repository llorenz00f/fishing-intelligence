import { ForecastService } from "@/application/services/forecast-service";
import { calculateFishingScore } from "@/domain/scoring";
import type { HistoricalSessionFeature } from "@/domain/personalization/types";
import type { FishingSession } from "@/domain/sessions/types";
import { createProviderBundle } from "@/infrastructure/providers/provider-factory";
import type { LocationPoint } from "@/types/product";

export const demoLocation: LocationPoint = {
  latitude: 42.7639,
  longitude: 10.8813,
  label: "Castiglione della Pescaia",
};

export const demoSpots = [
  {
    id: "spot-1",
    name: "Scogliera nord",
    location: { latitude: 42.769, longitude: 10.865, label: "Scogliera nord" },
    discipline: "SHORE_SPINNING",
    notes: "Privato, demo development.",
  },
  {
    id: "spot-2",
    name: "Canale sabbioso",
    location: { latitude: 42.757, longitude: 10.89, label: "Canale sabbioso" },
    discipline: "SURFCASTING",
    notes: "Privato, demo development.",
  },
  {
    id: "spot-3",
    name: "Fondale 25 m",
    location: { latitude: 42.741, longitude: 10.845, label: "Fondale 25 m" },
    discipline: "BOAT",
    notes: "Privato, demo development.",
  },
] as const;

const baseHistory: HistoricalSessionFeature[] = [
  sample("hist-01", 1, 375, 12, 0.7, 0.3, 16.2, 0.22, 1018, 150, 120, 2, 4),
  sample("hist-02", 1, 420, 18, 1.1, 0.8, 15.6, 0.31, 1014, 160, 135, 0, 3),
  sample("hist-03", 2, 390, 9, 0.4, 0.2, 14.8, 0.18, 1020, 130, 110, 1, 5),
  sample("hist-04", 2, 1080, 22, 1.4, 1.0, 14.9, 0.45, 1008, 210, 90, 0, 2),
  sample("hist-05", 3, 360, 8, 0.3, 0.2, 15.7, 0.2, 1022, 145, 150, 2, 5),
  sample("hist-06", 3, 1120, 16, 0.9, 0.7, 16.5, 0.28, 1016, 190, 95, 0, 3),
  sample("hist-07", 10, 395, 14, 0.8, 0.6, 20.4, 0.35, 1015, 220, 130, 1, 4),
  sample("hist-08", 10, 1050, 11, 0.5, 0.4, 20.1, 0.25, 1019, 240, 125, 1, 4),
  sample("hist-09", 11, 370, 19, 1.0, 0.7, 18.3, 0.34, 1017, 250, 160, 3, 5),
  sample("hist-10", 11, 430, 7, 0.2, 0.1, 18.9, 0.11, 1024, 120, 85, 0, 2),
  sample("hist-11", 12, 405, 13, 0.6, 0.4, 17.8, 0.21, 1020, 145, 140, 2, 5),
  sample("hist-12", 12, 1000, 28, 1.6, 1.2, 17.3, 0.49, 1006, 200, 70, 0, 1),
  sample("hist-13", 1, 455, 10, 0.5, 0.3, 16.1, 0.19, 1021, 170, 155, 1, 4),
  sample("hist-14", 2, 360, 15, 0.8, 0.5, 15.2, 0.27, 1013, 190, 150, 2, 5),
  sample("hist-15", 10, 380, 17, 1.2, 0.9, 20.7, 0.4, 1011, 230, 110, 0, 3),
  sample("hist-16", 11, 420, 9, 0.4, 0.2, 18.1, 0.22, 1023, 135, 125, 1, 4),
  sample("hist-17", 12, 390, 12, 0.7, 0.5, 17.1, 0.3, 1018, 145, 145, 1, 4),
  sample("hist-18", 1, 1035, 24, 1.5, 1.1, 16.4, 0.46, 1009, 205, 80, 0, 2),
];

export const demoHistory: HistoricalSessionFeature[] = baseHistory;

export const demoSessions: FishingSession[] = baseHistory.slice(0, 8).map((item, index) => ({
  id: `session-${index + 1}`,
  userId: "demo-user",
  discipline: item.discipline,
  technique: item.technique,
  targetSpecies: item.species,
  startTime: new Date(Date.UTC(2026, item.month - 1, 4 + index, Math.floor(item.timeOfDayMinutes / 60), item.timeOfDayMinutes % 60)).toISOString(),
  endTime: new Date(
    Date.UTC(2026, item.month - 1, 4 + index, Math.floor((item.timeOfDayMinutes + item.durationMinutes) / 60), (item.timeOfDayMinutes + item.durationMinutes) % 60),
  ).toISOString(),
  startLocation: demoLocation,
  primarySpot: demoSpots[index % demoSpots.length].name,
  outcome: item.outcome.catches > 0 ? "CATCHES" : item.outcome.strikes > 0 ? "STRIKES" : "NONE",
  rating: item.outcome.rating,
  catches:
    item.outcome.catches > 0
      ? [
          {
            id: `catch-${index + 1}`,
            sessionId: `session-${index + 1}`,
            species: item.species ?? "SPIGOLA",
            timestamp: new Date(Date.UTC(2026, item.month - 1, 4 + index, 6, 25)).toISOString(),
            location: demoLocation,
            estimatedWeightKg: 1.2 + index * 0.2,
            released: index % 2 === 0,
            notes: "Dato demo.",
          },
        ]
      : [],
  events: [
    {
      id: `event-${index + 1}`,
      clientId: `event-${index + 1}`,
      sessionId: `session-${index + 1}`,
      type: item.outcome.catches > 0 ? "CATCH" : item.outcome.strikes > 0 ? "STRIKE" : "NOTE",
      timestamp: new Date(Date.UTC(2026, item.month - 1, 4 + index, 6, 10)).toISOString(),
      note: item.outcome.catches > 0 ? "Cattura demo" : "Evento demo",
      synced: true,
    },
  ],
  conditionScore: estimateConditionScore(item),
}));

export async function getDemoForecast() {
  const service = new ForecastService(createProviderBundle());
  return service.getForecast({
    location: demoLocation,
    discipline: "SHORE_SPINNING",
    technique: "SHORE_SPINNING",
    species: "SPIGOLA",
    start: new Date().toISOString(),
    days: 7,
    history: demoHistory,
  });
}

function sample(
  id: string,
  month: number,
  timeOfDayMinutes: number,
  windSpeedKph: number,
  waveHeightM: number,
  swellHeightM: number,
  seaSurfaceTemperatureC: number,
  currentVelocityMps: number,
  pressureMslHpa: number,
  windDirectionDeg: number,
  durationMinutes: number,
  catches: number,
  rating: number,
): HistoricalSessionFeature {
  return {
    id,
    discipline: "SHORE_SPINNING",
    technique: "SHORE_SPINNING",
    species: "SPIGOLA",
    month,
    timeOfDayMinutes,
    windSpeedKph,
    windDirectionDeg,
    waveHeightM,
    waveDirectionDeg: 250,
    swellHeightM,
    seaSurfaceTemperatureC,
    currentVelocityMps,
    currentDirectionDeg: 180,
    pressureMslHpa,
    pressureTrend: pressureMslHpa < 1012 ? "FALLING" : pressureMslHpa > 1021 ? "RISING" : "STABLE",
    seaLevelHeightM: Math.sin(timeOfDayMinutes / 180) * 0.2,
    depthM: 16 + catches,
    durationMinutes,
    outcome: {
      catches,
      strikes: catches > 0 ? catches + 1 : rating >= 3 ? 1 : 0,
      rating,
    },
  };
}

function estimateConditionScore(item: HistoricalSessionFeature) {
  const snapshot = {
    timestamp: new Date(Date.UTC(2026, item.month - 1, 2, Math.floor(item.timeOfDayMinutes / 60))).toISOString(),
    location: demoLocation,
    weather: {
      pressureMslHpa: item.pressureMslHpa,
      pressureTrend: item.pressureTrend,
      windSpeedKph: item.windSpeedKph,
      windDirectionDeg: item.windDirectionDeg,
      windGustKph: item.windSpeedKph ? item.windSpeedKph + 8 : undefined,
    },
    marine: {
      waveHeightM: item.waveHeightM,
      waveDirectionDeg: item.waveDirectionDeg,
      swellHeightM: item.swellHeightM,
      seaSurfaceTemperatureC: item.seaSurfaceTemperatureC,
      oceanCurrentVelocityMps: item.currentVelocityMps,
      oceanCurrentDirectionDeg: item.currentDirectionDeg,
      seaLevelHeightM: item.seaLevelHeightM,
      depthM: item.depthM,
    },
    astronomical: {
      sunrise: new Date(Date.UTC(2026, item.month - 1, 2, 5)).toISOString(),
      sunset: new Date(Date.UTC(2026, item.month - 1, 2, 18)).toISOString(),
      isDay: true,
    },
    derived: {
      month: item.month,
      minutesFromSunrise: item.timeOfDayMinutes - 300,
      minutesToSunset: 1080 - item.timeOfDayMinutes,
      forecastHorizonHours: 4,
    },
    provider: "demo",
    fetchedAt: new Date().toISOString(),
    missingFields: [],
    dataCoverage: 100,
  };

  return calculateFishingScore({
    location: demoLocation,
    datetime: snapshot.timestamp,
    discipline: "SHORE_SPINNING",
    technique: "SHORE_SPINNING",
    species: "SPIGOLA",
    environment: snapshot,
    userHistory: [],
  }).finalScore;
}
