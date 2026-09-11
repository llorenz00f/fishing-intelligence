import { z } from "zod";
import type { SubscriptionPlan } from "@/types/product";
import { canUseFeature } from "@/domain/account/access";

export type { SubscriptionPlan } from "@/types/product";

export const THEME_IDS = [
  "deep-ocean",
  "mediterranean-light",
  "sunset",
  "graphite-marine",
  "abyss",
  "dynamic-weather",
] as const;

export const AMBIENT_EFFECT_INTENSITIES = ["off", "reduced", "standard"] as const;
export const APPEARANCE_MODES = ["system", "dark", "light"] as const;

export const appearancePreferencesSchema = z.object({
  themeId: z.enum(THEME_IDS),
  dynamicWeatherThemeEnabled: z.boolean(),
  ambientEffectIntensity: z.enum(AMBIENT_EFFECT_INTENSITIES),
  appearanceMode: z.enum(APPEARANCE_MODES),
  reducedMotion: z.boolean(),
}).strict();

export type ThemeId = (typeof THEME_IDS)[number];
export type AmbientEffectIntensity = (typeof AMBIENT_EFFECT_INTENSITIES)[number];
export type AppearanceMode = (typeof APPEARANCE_MODES)[number];
export type AppearancePreferences = z.infer<typeof appearancePreferencesSchema>;

export const DEFAULT_APPEARANCE_PREFERENCES: Readonly<AppearancePreferences> = Object.freeze({
  themeId: "deep-ocean",
  dynamicWeatherThemeEnabled: false,
  ambientEffectIntensity: "standard",
  appearanceMode: "system",
  reducedMotion: false,
});

export const defaultAppearancePreferences = DEFAULT_APPEARANCE_PREFERENCES;

export type AppearanceProfileResponse =
  | {
      userId: null;
      plan: SubscriptionPlan;
      preferences: null;
      storage: "local";
      displayName: null;
    }
  | {
      userId: string;
      plan: SubscriptionPlan;
      preferences: AppearancePreferences;
      storage: "profile";
      displayName: string | null;
    };

export function isPremiumPlan(plan: unknown): plan is "PRO" | "CAPTAIN" {
  return canUseFeature({ plan }, "CUSTOM_THEMES");
}

export const canUsePremiumAppearance = isPremiumPlan;

export function canUseTheme(themeId: ThemeId, plan: unknown): boolean {
  return themeId === "deep-ocean" || (THEME_IDS.includes(themeId) && isPremiumPlan(plan));
}

const storedPreferencesSchema = z.object({
  themeId: appearancePreferencesSchema.shape.themeId.catch(DEFAULT_APPEARANCE_PREFERENCES.themeId),
  dynamicWeatherThemeEnabled: appearancePreferencesSchema.shape.dynamicWeatherThemeEnabled.catch(false),
  ambientEffectIntensity: appearancePreferencesSchema.shape.ambientEffectIntensity.catch("standard"),
  appearanceMode: appearancePreferencesSchema.shape.appearanceMode.catch("system"),
  reducedMotion: appearancePreferencesSchema.shape.reducedMotion.catch(false),
});

/** Recover stored settings and apply current entitlements without losing accessibility choices. */
export function normalizeAppearancePreferences(
  input: unknown,
  plan: SubscriptionPlan = "FREE",
): AppearancePreferences {
  const parsed = storedPreferencesSchema.safeParse(input);
  const preferences = parsed.success ? parsed.data : { ...DEFAULT_APPEARANCE_PREFERENCES };

  if (!canUseTheme(preferences.themeId, plan)) preferences.themeId = "deep-ocean";
  if (!isPremiumPlan(plan)) preferences.dynamicWeatherThemeEnabled = false;

  return preferences;
}
