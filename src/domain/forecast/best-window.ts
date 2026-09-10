export type HourlyScore = {
  timestamp: string;
  score: number;
};

export type BestFishingWindow = {
  start: string;
  end: string;
  averageScore: number;
  peakScore: number;
};

export function findBestFishingWindow(scores: HourlyScore[], minHours = 2): BestFishingWindow | null {
  if (scores.length < minHours) return null;

  let best: BestFishingWindow | null = null;
  for (let startIndex = 0; startIndex <= scores.length - minHours; startIndex += 1) {
    for (let endIndex = startIndex + minHours - 1; endIndex < scores.length; endIndex += 1) {
      const slice = scores.slice(startIndex, endIndex + 1);
      const averageScore = Math.round(slice.reduce((sum, item) => sum + item.score, 0) / slice.length);
      const peakScore = Math.max(...slice.map((item) => item.score));
      const stabilityPenalty = Math.max(...slice.map((item) => Math.abs(item.score - averageScore))) * 0.25;
      const rank = averageScore - stabilityPenalty;
      const bestRank = best ? best.averageScore - (best.peakScore - best.averageScore) * 0.25 : -1;

      if (!best || rank > bestRank) {
        best = {
          start: slice[0].timestamp,
          end: addHours(slice[slice.length - 1].timestamp, 1),
          averageScore,
          peakScore,
        };
      }
    }
  }

  return best;
}

function addHours(timestamp: string, hours: number) {
  return new Date(new Date(timestamp).getTime() + hours * 60 * 60 * 1000).toISOString();
}
