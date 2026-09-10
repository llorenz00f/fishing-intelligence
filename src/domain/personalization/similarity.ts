import type { EnvironmentSnapshot } from "@/domain/forecast/types";
import type { HistoricalSessionFeature, SimilarityResult } from "@/domain/personalization/types";
import type { DisciplineCode, TechniqueCode } from "@/types/product";

function boundedSimilarity(a: number | undefined, b: number | undefined, spread: number) {
  if (a === undefined || b === undefined) return null;
  return Math.max(0, 1 - Math.abs(a - b) / spread);
}

function circularSimilarity(a: number | undefined, b: number | undefined) {
  if (a === undefined || b === undefined) return null;
  const diff = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return Math.max(0, 1 - diff / 180);
}

function outcomeScore(session: HistoricalSessionFeature) {
  const catchScore = Math.min(100, session.outcome.catches * 34);
  const strikeScore = Math.min(40, session.outcome.strikes * 10);
  const ratingScore = session.outcome.rating ? session.outcome.rating * 12 : 0;
  return Math.max(catchScore + strikeScore, ratingScore, session.outcome.strikes > 0 ? 45 : 18);
}

export function calculateSimilarity(input: {
  discipline: DisciplineCode;
  technique: TechniqueCode;
  species?: string;
  environment: EnvironmentSnapshot;
  history: HistoricalSessionFeature[];
}): SimilarityResult {
  const comparable = input.history.filter((session) => {
    if (session.discipline !== input.discipline) return false;
    if (session.technique !== input.technique) return false;
    if (input.species && session.species && session.species !== input.species) return false;
    return true;
  });

  const scored = comparable
    .map((session) => {
      const similarities = [
        boundedSimilarity(input.environment.derived.month, session.month, 6),
        boundedSimilarity(minutesOfDay(input.environment.timestamp), session.timeOfDayMinutes, 360),
        boundedSimilarity(input.environment.weather.windSpeedKph, session.windSpeedKph, 35),
        circularSimilarity(input.environment.weather.windDirectionDeg, session.windDirectionDeg),
        boundedSimilarity(input.environment.marine.waveHeightM, session.waveHeightM, 2.5),
        circularSimilarity(input.environment.marine.waveDirectionDeg, session.waveDirectionDeg),
        boundedSimilarity(input.environment.marine.swellHeightM, session.swellHeightM, 2.2),
        boundedSimilarity(input.environment.marine.seaSurfaceTemperatureC, session.seaSurfaceTemperatureC, 8),
        boundedSimilarity(input.environment.marine.oceanCurrentVelocityMps, session.currentVelocityMps, 0.9),
        circularSimilarity(input.environment.marine.oceanCurrentDirectionDeg, session.currentDirectionDeg),
        boundedSimilarity(input.environment.weather.pressureMslHpa, session.pressureMslHpa, 28),
        boundedSimilarity(input.environment.marine.seaLevelHeightM, session.seaLevelHeightM, 0.7),
        boundedSimilarity(input.environment.marine.depthM, session.depthM, 55),
      ].filter((value): value is number => value !== null);

      const similarity = similarities.length
        ? similarities.reduce((sum, value) => sum + value, 0) / similarities.length
        : 0;

      return {
        session,
        similarity,
        outcomeScore: outcomeScore(session),
      };
    })
    .filter((entry) => entry.similarity >= 0.55)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 12);

  const weightedOutcome = scored.reduce((sum, entry) => sum + entry.outcomeScore * entry.similarity, 0);
  const totalWeight = scored.reduce((sum, entry) => sum + entry.similarity, 0);
  const personalScore = totalWeight > 0 ? Math.round(weightedOutcome / totalWeight) : null;
  const similarityPercentage = scored.length
    ? Math.round((scored.reduce((sum, entry) => sum + entry.similarity, 0) / scored.length) * 100)
    : 0;
  const successfulSimilarSessions = scored.filter((entry) => entry.session.outcome.catches > 0).length;
  const unsuccessfulSimilarSessions = scored.filter(
    (entry) => entry.session.outcome.catches === 0 && entry.session.outcome.strikes === 0,
  ).length;

  return {
    similarSessions: scored,
    similarityPercentage,
    successfulSimilarSessions,
    unsuccessfulSimilarSessions,
    personalScore,
    confidence: Math.min(100, Math.round(scored.length * 8 + similarityPercentage * 0.35)),
  };
}

export function personalWeightForSessionCount(sessionCount: number) {
  if (sessionCount < 10) return 0;
  return Math.min(0.65, sessionCount / (sessionCount + 25));
}

function minutesOfDay(timestamp: string) {
  const date = new Date(timestamp);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}
