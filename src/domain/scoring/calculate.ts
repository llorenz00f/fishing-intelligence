import type {
  FishingScoreInput,
  FishingScoreResult,
  ScoreFactorMessage,
  ScoringFactorKey,
} from "@/domain/scoring/types";
import { calculateSimilarity, personalWeightForSessionCount } from "@/domain/personalization/similarity";
import {
  clampScore,
  currentScore,
  daylightScore,
  pressureScore,
  pressureTrendScore,
  seasonScore,
  sstScore,
  swellHeightScore,
  waveHeightScore,
  windSpeedScore,
} from "@/domain/scoring/normalizers";
import { getScoreProfile } from "@/domain/scoring/profiles";
import { assessSafety } from "@/domain/scoring/safety";

const labels: Record<ScoringFactorKey, string> = {
  waveHeight: "Onda",
  swellHeight: "Swell",
  windSpeed: "Vento",
  sst: "Temperatura mare",
  current: "Corrente",
  pressure: "Pressione",
  pressureTrend: "Trend pressione",
  daylight: "Luce",
  season: "Stagione",
  depth: "Profondita",
  tideProxy: "Variazione livello mare",
};

export function calculateFishingScore(input: FishingScoreInput): FishingScoreResult {
  const profile = getScoreProfile(input.technique);
  const factors = scoreFactors(input);
  const available = Object.entries(profile.weights)
    .map(([key, weight]) => {
      const typedKey = key as ScoringFactorKey;
      const factor = factors[typedKey];
      if (!factor) return null;
      return { key: typedKey, weight, ...factor };
    })
    .filter((factor): factor is NonNullable<typeof factor> => factor !== null);

  const totalWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
  const baseScore =
    totalWeight > 0
      ? clampScore(available.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight)
      : 50;
  const factorBreakdown = available.map((factor) => ({
    key: factor.key,
    label: labels[factor.key],
    score: clampScore(factor.score),
    weight: Number((factor.weight / totalWeight).toFixed(3)),
    weightedContribution: Number(((factor.score * factor.weight) / totalWeight).toFixed(1)),
    explanation: factor.explanation,
  }));

  const missingFactorKeys = (Object.keys(profile.weights) as ScoringFactorKey[]).filter((key) => !factors[key]);
  const dataCoverage = Math.round((available.length / Object.keys(profile.weights).length) * 100);
  const history = input.userHistory ?? [];
  const similarity = calculateSimilarity({
    discipline: input.discipline,
    technique: input.technique,
    species: input.species,
    environment: input.environment,
    history,
  });
  const usablePersonalScore =
    history.length >= 10 && similarity.personalScore !== null && similarity.similarSessions.length >= 5
      ? similarity.personalScore
      : null;
  const personalWeight = usablePersonalScore === null ? 0 : personalWeightForSessionCount(history.length);
  const finalScore = clampScore(baseScore * (1 - personalWeight) + (usablePersonalScore ?? baseScore) * personalWeight);
  const confidence = clampScore(
    dataCoverage * 0.58 +
      forecastConfidence(input.environment.derived.forecastHorizonHours) * 0.22 +
      Math.min(100, history.length * 2) * 0.08 +
      similarity.confidence * 0.12,
  );
  const safety = assessSafety(input);

  const positiveFactors: ScoreFactorMessage[] = factorBreakdown
    .filter((factor) => factor.score >= 72)
    .slice(0, 5)
    .map((factor) => ({ key: factor.key, label: factor.label, detail: factor.explanation }));
  const negativeFactors: ScoreFactorMessage[] = factorBreakdown
    .filter((factor) => factor.score <= 42)
    .slice(0, 4)
    .map((factor) => ({ key: factor.key, label: factor.label, detail: factor.explanation }));

  if (usablePersonalScore !== null) {
    positiveFactors.push({
      key: "history",
      label: "Storico personale",
      detail: `${similarity.similarSessions.length} sessioni simili trovate, similarita media ${similarity.similarityPercentage}%.`,
    });
  }

  return {
    available: input.environment.dataCoverage > 0,
    finalScore,
    baseScore,
    personalScore: usablePersonalScore,
    confidence,
    positiveFactors,
    negativeFactors,
    missingFactors: missingFactorKeys.map((key) => ({
      key,
      label: labels[key],
      detail: "Dato non disponibile: il peso e stato escluso e gli altri fattori sono stati rinormalizzati.",
    })),
    dataCoverage,
    safety,
    safetyWarnings: safety.warnings,
    factorBreakdown,
    modelVersion: "rules-v1",
  };
}

function scoreFactors(input: FishingScoreInput) {
  const { weather, marine, derived } = input.environment;
  const result: Partial<Record<ScoringFactorKey, { score: number; explanation: string }>> = {};

  if (marine.waveHeightM !== undefined) {
    result.waveHeight = {
      score: waveHeightScore(marine.waveHeightM, input.discipline),
      explanation: `${marine.waveHeightM.toFixed(1)} m: impatto valutato per ${input.discipline.toLowerCase()}.`,
    };
  }
  if (marine.swellHeightM !== undefined) {
    result.swellHeight = {
      score: swellHeightScore(marine.swellHeightM, input.discipline),
      explanation: `${marine.swellHeightM.toFixed(1)} m di swell previsto.`,
    };
  }
  if (weather.windSpeedKph !== undefined) {
    result.windSpeed = {
      score: windSpeedScore(weather.windSpeedKph, input.discipline),
      explanation: `${Math.round(weather.windSpeedKph)} km/h: vento pesato in modo diverso per disciplina.`,
    };
  }
  if (marine.seaSurfaceTemperatureC !== undefined) {
    result.sst = {
      score: sstScore(marine.seaSurfaceTemperatureC, input.species),
      explanation: `${marine.seaSurfaceTemperatureC.toFixed(1)} C rispetto al range atteso per la specie.`,
    };
  }
  if (marine.oceanCurrentVelocityMps !== undefined) {
    result.current = {
      score: currentScore(marine.oceanCurrentVelocityMps, input.discipline),
      explanation: `${marine.oceanCurrentVelocityMps.toFixed(2)} m/s: corrente confrontata con il profilo tecnica.`,
    };
  }
  if (weather.pressureMslHpa !== undefined) {
    result.pressure = {
      score: pressureScore(weather.pressureMslHpa),
      explanation: `${Math.round(weather.pressureMslHpa)} hPa sul livello del mare.`,
    };
  }
  if (weather.pressureTrend !== undefined) {
    result.pressureTrend = {
      score: pressureTrendScore(weather.pressureTrend),
      explanation: `Trend ${weather.pressureTrend.toLowerCase().replaceAll("_", " ")} calcolato sulle ore precedenti.`,
    };
  }
  if (derived.minutesFromSunrise !== undefined || derived.minutesToSunset !== undefined) {
    result.daylight = {
      score: daylightScore(derived.minutesFromSunrise, derived.minutesToSunset),
      explanation: "Prossimita ad alba o tramonto valutata come finestra di attivita.",
    };
  }
  result.season = {
    score: seasonScore(derived.month, input.species),
    explanation: `Mese ${derived.month}: stagionalita prototipo per specie mediterranee.`,
  };
  if (marine.depthM !== undefined) {
    result.depth = {
      score: clampScore(100 - Math.abs(marine.depthM - 18) * 2.2),
      explanation: `${Math.round(marine.depthM)} m: profondita usata come euristica prototipo, non per navigazione.`,
    };
  }
  if (marine.seaLevelHeightM !== undefined) {
    result.tideProxy = {
      score: clampScore(70 + Math.min(25, Math.abs(marine.seaLevelHeightM) * 45)),
      explanation: `${marine.seaLevelHeightM.toFixed(2)} m come proxy di variazione del livello mare.`,
    };
  }

  return result;
}

function forecastConfidence(horizonHours: number) {
  if (horizonHours <= 24) return 96;
  if (horizonHours <= 72) return 82;
  if (horizonHours <= 120) return 66;
  return 52;
}
