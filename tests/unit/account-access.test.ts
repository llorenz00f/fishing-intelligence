import { describe, expect, it } from "vitest";
import { canSwitchTestPlan, canUseFeature } from "@/domain/account/access";
import { authErrorMessage, safeAuthDestination, signupSchema } from "@/domain/account/auth";

describe("account permissions", () => {
  it("keeps premium capabilities centralised by active plan", () => {
    expect(canUseFeature({ plan: "FREE" }, "CUSTOM_THEMES")).toBe(false);
    expect(canUseFeature({ plan: "PRO" }, "CUSTOM_THEMES")).toBe(true);
    expect(canUseFeature({ plan: "CAPTAIN" }, "DYNAMIC_WEATHER_THEME")).toBe(true);
    expect(canUseFeature({ plan: "PRO" }, "UNKNOWN" as never)).toBe(false);
  });

  it("allows test-plan switching only to admins and beta testers", () => {
    expect(canSwitchTestPlan({ role: "user", isBetaTester: false })).toBe(false);
    expect(canSwitchTestPlan({ role: "user", isBetaTester: true })).toBe(true);
    expect(canSwitchTestPlan({ role: "admin", isBetaTester: false })).toBe(true);
  });

  it("validates beta signup and keeps redirects local", () => {
    expect(signupSchema.safeParse({ email: "test@example.com", password: "password", confirmPassword: "password", isBetaTester: true }).success).toBe(true);
    expect(signupSchema.safeParse({ email: "test@example.com", password: "password", confirmPassword: "different", isBetaTester: false }).success).toBe(false);
    expect(safeAuthDestination("https://example.com")).toBe("/dashboard");
    expect(safeAuthDestination("/profile/security")).toBe("/profile/security");
  });

  it("translates common auth failures into useful messages", () => {
    expect(authErrorMessage({ code: "user_already_exists" })).toContain("gia registrata");
    expect(authErrorMessage({ code: "invalid_credentials" })).toContain("non corrette");
  });
});
