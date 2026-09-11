import { z } from "zod";
import type { SubscriptionPlan } from "@/types/product";

export const plans = ["FREE", "PRO", "CAPTAIN"] as const;
export const features = ["CUSTOM_THEMES", "DYNAMIC_WEATHER_THEME", "ADVANCED_INSIGHTS", "UNLIMITED_SPOTS", "ADVANCED_FORECAST", "ALERTS"] as const;
export type Feature = (typeof features)[number];
export type AccountProfile = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  isBetaTester: boolean;
  plan: SubscriptionPlan;
  onboardingCompleted: boolean;
  homeLocation: { latitude: number; longitude: number; label: string } | null;
  preferredUnits: { system: "metric"; wind: "knots"; temperature: "celsius" };
};

export function canUseFeature(user: { plan?: unknown } | null | undefined, feature: Feature): boolean {
  return features.includes(feature) && (user?.plan === "PRO" || user?.plan === "CAPTAIN");
}

export function canSwitchTestPlan(user: { role?: unknown; isBetaTester?: unknown } | null | undefined): boolean {
  return user?.role === "admin" || user?.isBetaTester === true;
}

export const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  label: z.string().trim().min(1).max(100),
}).strict();

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  homeLocation: locationSchema.nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  preferredUnits: z.object({ system: z.literal("metric"), wind: z.literal("knots"), temperature: z.literal("celsius") }).strict().optional(),
  disciplines: z.array(z.enum(["SURFCASTING", "SHORE_SPINNING", "BOAT", "SPEARFISHING"])).max(4).optional(),
  species: z.array(z.string().max(50)).max(30).optional(),
}).strict();

export const testPlanSchema = z.object({ plan: z.enum(plans) }).strict();
