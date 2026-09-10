import type { DisciplineCode, PressureTrend } from "@/types/product";

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function triangularScore(value: number, idealMin: number, idealMax: number, outerMin: number, outerMax: number) {
  if (value < outerMin || value > outerMax) return 0;
  if (value >= idealMin && value <= idealMax) return 100;
  if (value < idealMin) return ((value - outerMin) / (idealMin - outerMin)) * 100;
  return ((outerMax - value) / (outerMax - idealMax)) * 100;
}

export function waveHeightScore(value: number, discipline: DisciplineCode) {
  const ranges: Record<DisciplineCode, [number, number, number, number]> = {
    SURFCASTING: [0.6, 1.6, 0.05, 2.8],
    SHORE_SPINNING: [0.25, 1.1, 0, 2.2],
    BOAT: [0, 0.6, 0, 1.8],
    SPEARFISHING: [0, 0.45, 0, 1.4],
  };
  return clampScore(triangularScore(value, ...ranges[discipline]));
}

export function swellHeightScore(value: number, discipline: DisciplineCode) {
  const ranges: Record<DisciplineCode, [number, number, number, number]> = {
    SURFCASTING: [0.5, 1.5, 0, 2.6],
    SHORE_SPINNING: [0.2, 1, 0, 2],
    BOAT: [0, 0.5, 0, 1.6],
    SPEARFISHING: [0, 0.35, 0, 1.2],
  };
  return clampScore(triangularScore(value, ...ranges[discipline]));
}

export function windSpeedScore(valueKph: number, discipline: DisciplineCode) {
  const ranges: Record<DisciplineCode, [number, number, number, number]> = {
    SURFCASTING: [6, 22, 0, 42],
    SHORE_SPINNING: [4, 18, 0, 38],
    BOAT: [0, 14, 0, 34],
    SPEARFISHING: [0, 12, 0, 30],
  };
  return clampScore(triangularScore(valueKph, ...ranges[discipline]));
}

export function sstScore(valueC: number, species?: string) {
  const preferred: Record<string, [number, number, number, number]> = {
    SPIGOLA: [13, 19, 9, 25],
    ORATA: [17, 24, 12, 29],
    DENTICE: [16, 23, 11, 28],
    RICCIOLA: [19, 25, 15, 29],
    TONNO_ROSSO: [18, 24, 14, 28],
    CALAMARO: [13, 19, 9, 24],
  };
  return clampScore(triangularScore(valueC, ...(preferred[species ?? ""] ?? [15, 23, 9, 29])));
}

export function currentScore(valueMps: number, discipline: DisciplineCode) {
  const ranges: Record<DisciplineCode, [number, number, number, number]> = {
    SURFCASTING: [0.08, 0.35, 0, 0.8],
    SHORE_SPINNING: [0.1, 0.45, 0, 0.9],
    BOAT: [0.05, 0.55, 0, 1],
    SPEARFISHING: [0, 0.2, 0, 0.65],
  };
  return clampScore(triangularScore(valueMps, ...ranges[discipline]));
}

export function pressureScore(valueHpa: number) {
  return clampScore(triangularScore(valueHpa, 1012, 1024, 996, 1036));
}

export function pressureTrendScore(trend: PressureTrend) {
  const scores: Record<PressureTrend, number> = {
    RAPIDLY_FALLING: 30,
    FALLING: 62,
    STABLE: 78,
    RISING: 72,
    RAPIDLY_RISING: 45,
  };
  return scores[trend];
}

export function daylightScore(minutesFromSunrise?: number, minutesToSunset?: number) {
  const sunrise = minutesFromSunrise === undefined ? 999 : Math.abs(minutesFromSunrise);
  const sunset = minutesToSunset === undefined ? 999 : Math.abs(minutesToSunset);
  const nearest = Math.min(sunrise, sunset);
  if (nearest <= 90) return 100;
  if (nearest <= 180) return 76;
  if (nearest <= 360) return 58;
  return 42;
}

export function seasonScore(month: number, species?: string) {
  const preferred: Record<string, number[]> = {
    SPIGOLA: [1, 2, 3, 10, 11, 12],
    ORATA: [5, 6, 7, 8, 9, 10],
    DENTICE: [4, 5, 6, 9, 10],
    RICCIOLA: [5, 6, 7, 8, 9],
    TONNO_ROSSO: [6, 7, 8, 9],
    CALAMARO: [10, 11, 12, 1, 2],
  };
  const months = preferred[species ?? ""];
  if (!months) return 68;
  if (months.includes(month)) return 92;
  const near = months.some((candidate) => Math.abs(candidate - month) === 1 || Math.abs(candidate - month) === 11);
  return near ? 68 : 42;
}
