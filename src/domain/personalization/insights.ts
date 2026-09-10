import type { HistoricalSessionFeature } from "@/domain/personalization/types";

export type InsightKpi = {
  totalSessions: number;
  totalHours: number;
  catches: number;
  strikes: number;
  catchPerHour: number;
  successRate: number;
  activityRate: number;
};

export type DataDrivenInsight = {
  title: string;
  detail: string;
  sampleSize: number;
};

export function buildInsightKpis(history: HistoricalSessionFeature[]): InsightKpi {
  const totalHours = history.reduce((sum, session) => sum + session.durationMinutes / 60, 0);
  const catches = history.reduce((sum, session) => sum + session.outcome.catches, 0);
  const strikes = history.reduce((sum, session) => sum + session.outcome.strikes, 0);
  return {
    totalSessions: history.length,
    totalHours: Math.round(totalHours),
    catches,
    strikes,
    catchPerHour: totalHours > 0 ? Number((catches / totalHours).toFixed(2)) : 0,
    successRate: history.length ? Math.round((history.filter((session) => session.outcome.catches > 0).length / history.length) * 100) : 0,
    activityRate: history.length
      ? Math.round((history.filter((session) => session.outcome.catches > 0 || session.outcome.strikes > 0).length / history.length) * 100)
      : 0,
  };
}

export function buildDataDrivenInsights(history: HistoricalSessionFeature[]): DataDrivenInsight[] {
  if (history.length < 8) return [];
  const productive = history.filter((session) => session.outcome.catches > 0 || session.outcome.strikes > 0);
  const insights: DataDrivenInsight[] = [];

  const dawnProductive = productive.filter((session) => Math.abs(session.timeOfDayMinutes - 360) <= 90);
  if (productive.length >= 5 && dawnProductive.length / productive.length >= 0.45) {
    insights.push({
      title: "Alba molto presente nelle sessioni attive",
      detail: `${dawnProductive.length} sessioni produttive su ${productive.length} sono avvenute entro 90 minuti dall'alba.`,
      sampleSize: productive.length,
    });
  }

  const waveBand = bandActivity(history, "waveHeightM", 0.4, 1.1);
  if (waveBand.sampleSize >= 5 && waveBand.activityRate > buildInsightKpis(history).activityRate) {
    insights.push({
      title: "Onda moderata sopra la tua media",
      detail: `Con onda tra 0,4 m e 1,1 m hai avuto activity rate ${waveBand.activityRate}% contro la media generale ${buildInsightKpis(history).activityRate}%.`,
      sampleSize: waveBand.sampleSize,
    });
  }

  const sstBand = bandActivity(productive, "seaSurfaceTemperatureC", 15, 19);
  if (sstBand.sampleSize >= 5) {
    insights.push({
      title: "Range SST ricorrente per la spigola",
      detail: `${sstBand.sampleSize} sessioni attive sono avvenute con temperatura mare tra 15 C e 19 C.`,
      sampleSize: productive.length,
    });
  }

  return insights;
}

function bandActivity(
  history: HistoricalSessionFeature[],
  key: "waveHeightM" | "seaSurfaceTemperatureC",
  min: number,
  max: number,
) {
  const inBand = history.filter((session) => {
    const value = session[key];
    return value !== undefined && value >= min && value <= max;
  });
  const active = inBand.filter((session) => session.outcome.catches > 0 || session.outcome.strikes > 0);
  return {
    sampleSize: inBand.length,
    activityRate: inBand.length ? Math.round((active.length / inBand.length) * 100) : 0,
  };
}
