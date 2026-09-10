import type { PressureTrend } from "@/types/product";

export function calculatePressureTrend(values: number[]): PressureTrend {
  if (values.length < 3) return "STABLE";
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;

  if (delta <= -6) return "RAPIDLY_FALLING";
  if (delta <= -2) return "FALLING";
  if (delta >= 6) return "RAPIDLY_RISING";
  if (delta >= 2) return "RISING";
  return "STABLE";
}
