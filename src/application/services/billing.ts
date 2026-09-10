import { env } from "@/lib/env";
import type { SubscriptionPlan } from "@/types/product";

export type PlanLimits = {
  maxSpots: number;
  extendedForecastDays: number;
  advancedInsights: boolean;
  alerts: boolean;
};

export const planLimits: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxSpots: 5,
    extendedForecastDays: 7,
    advancedInsights: false,
    alerts: false,
  },
  PRO: {
    maxSpots: Number.POSITIVE_INFINITY,
    extendedForecastDays: 14,
    advancedInsights: true,
    alerts: true,
  },
  CAPTAIN: {
    maxSpots: Number.POSITIVE_INFINITY,
    extendedForecastDays: 21,
    advancedInsights: true,
    alerts: true,
  },
};

export function isBillingEnabled() {
  return env.BILLING_ENABLED;
}
