import type { EnvironmentSnapshot } from "@/domain/forecast/types";
import type { HistoricalSessionFeature } from "@/domain/personalization/types";
import type { DisciplineCode, LocationPoint, TechniqueCode } from "@/types/product";

export type ScoringFactorKey =
  | "waveHeight"
  | "swellHeight"
  | "windSpeed"
  | "sst"
  | "current"
  | "pressure"
  | "pressureTrend"
  | "daylight"
  | "season"
  | "depth"
  | "tideProxy";

export type FactorBreakdown = {
  key: ScoringFactorKey;
  label: string;
  score: number;
  weight: number;
  weightedContribution: number;
  explanation: string;
};

export type ScoreFactorMessage = {
  key: ScoringFactorKey | "history" | "coverage" | "safety";
  label: string;
  detail: string;
};

export type SafetyAssessment = {
  level: "LOW" | "MODERATE" | "HIGH";
  warnings: string[];
  suppressGoCta: boolean;
};

export type FishingScoreInput = {
  location: LocationPoint;
  datetime: string;
  discipline: DisciplineCode;
  technique: TechniqueCode;
  species?: string;
  environment: EnvironmentSnapshot;
  userHistory?: HistoricalSessionFeature[];
};

export type FishingScoreResult = {
  available?: boolean;
  finalScore: number;
  baseScore: number;
  personalScore: number | null;
  confidence: number;
  positiveFactors: ScoreFactorMessage[];
  negativeFactors: ScoreFactorMessage[];
  missingFactors: ScoreFactorMessage[];
  dataCoverage: number;
  safety: SafetyAssessment;
  safetyWarnings: string[];
  factorBreakdown: FactorBreakdown[];
  modelVersion: "rules-v1";
};

export type TechniqueScoreProfile = {
  discipline: DisciplineCode;
  technique: TechniqueCode;
  version: "rules-v1";
  active: boolean;
  validFrom: string;
  weights: Record<ScoringFactorKey, number>;
};
