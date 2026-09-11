import { describe, expect, it } from "vitest";
import {
  AMBIENT_EFFECT_INTENSITIES,
  APPEARANCE_MODES,
  THEME_IDS,
  appearancePreferencesSchema,
  canUsePremiumAppearance,
  canUseTheme,
  defaultAppearancePreferences,
  normalizeAppearancePreferences,
} from "@/domain/appearance/preferences";

describe("appearance preferences", () => {
  it.each(THEME_IDS)("accepts stable theme %s and restricts it by plan", (themeId) => {
    expect(appearancePreferencesSchema.parse({ ...defaultAppearancePreferences, themeId }).themeId).toBe(themeId);
    expect(canUseTheme(themeId, "FREE")).toBe(themeId === "deep-ocean");
    expect(canUseTheme(themeId, "PRO")).toBe(true);
    expect(canUseTheme(themeId, "CAPTAIN")).toBe(true);
  });

  it.each(["free", "pro", "ADMIN", null, undefined, { plan: "PRO" }])("fails closed for untrusted plan %j", (plan) => {
    expect(canUsePremiumAppearance(plan)).toBe(false);
    expect(canUseTheme("sunset", plan)).toBe(false);
  });

  it.each([null, [], {}, { reducedMotion: true }, { ...defaultAppearancePreferences, themeId: "ocean" },
    { ...defaultAppearancePreferences, plan: "PRO" }, { ...defaultAppearancePreferences, userId: "someone-else" },
    { ...defaultAppearancePreferences, reducedMotion: "false" },
    { ...defaultAppearancePreferences, dynamicWeatherThemeEnabled: 1 },
    { ...defaultAppearancePreferences, ambientEffectIntensity: "high" },
    { ...defaultAppearancePreferences, appearanceMode: null },
  ])("rejects incomplete, malformed, or extra write fields: %j", (value) => {
    expect(appearancePreferencesSchema.safeParse(value).success).toBe(false);
  });

  it.each(AMBIENT_EFFECT_INTENSITIES)("retains FREE accessibility intensity %s in every mode", (ambientEffectIntensity) => {
    for (const appearanceMode of APPEARANCE_MODES) {
      const value = { ...defaultAppearancePreferences, ambientEffectIntensity, appearanceMode, reducedMotion: true };
      expect(normalizeAppearancePreferences(value)).toEqual(value);
    }
  });

  it("clamps paid settings on downgrade while preserving accessibility", () => {
    const value = {
      themeId: "dynamic-weather",
      dynamicWeatherThemeEnabled: true,
      ambientEffectIntensity: "off",
      appearanceMode: "light",
      reducedMotion: true,
    };
    expect(normalizeAppearancePreferences(value, "PRO")).toEqual(value);
    expect(normalizeAppearancePreferences(value, "FREE")).toEqual({
      ...value, themeId: "deep-ocean", dynamicWeatherThemeEnabled: false,
    });
    expect(value.themeId).toBe("dynamic-weather");
  });

  it("recovers invalid stored fields independently without discarding reduced motion", () => {
    expect(normalizeAppearancePreferences({
      themeId: "old-theme", appearanceMode: "light", reducedMotion: true, ambientEffectIntensity: "reduced",
    })).toEqual({ ...defaultAppearancePreferences, appearanceMode: "light", reducedMotion: true, ambientEffectIntensity: "reduced" });
    expect(normalizeAppearancePreferences(null)).toEqual(defaultAppearancePreferences);
    const result = normalizeAppearancePreferences(undefined);
    result.reducedMotion = true;
    expect(defaultAppearancePreferences.reducedMotion).toBe(false);
  });
});
