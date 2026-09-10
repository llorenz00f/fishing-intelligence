import type { DisciplineCode, PressureTrend, TechniqueCode } from "@/types/product";

export type HistoricalSessionOutcome = {
  catches: number;
  strikes: number;
  rating?: number;
};

export type HistoricalSessionFeature = {
  id: string;
  discipline: DisciplineCode;
  technique: TechniqueCode;
  species?: string;
  month: number;
  timeOfDayMinutes: number;
  windSpeedKph?: number;
  windDirectionDeg?: number;
  waveHeightM?: number;
  waveDirectionDeg?: number;
  swellHeightM?: number;
  seaSurfaceTemperatureC?: number;
  currentVelocityMps?: number;
  currentDirectionDeg?: number;
  pressureMslHpa?: number;
  pressureTrend?: PressureTrend;
  seaLevelHeightM?: number;
  depthM?: number;
  durationMinutes: number;
  outcome: HistoricalSessionOutcome;
};

export type SimilarSession = {
  session: HistoricalSessionFeature;
  similarity: number;
  outcomeScore: number;
};

export type SimilarityResult = {
  similarSessions: SimilarSession[];
  similarityPercentage: number;
  successfulSimilarSessions: number;
  unsuccessfulSimilarSessions: number;
  personalScore: number | null;
  confidence: number;
};
