import { describe, expect, it } from "vitest";
import { personalWeightForSessionCount } from "@/domain/personalization/similarity";

describe("personalWeightForSessionCount", () => {
  it("does not claim personalization for fewer than 10 sessions", () => {
    expect(personalWeightForSessionCount(4)).toBe(0);
    expect(personalWeightForSessionCount(9)).toBe(0);
  });

  it("grows progressively and caps at 65 percent", () => {
    expect(personalWeightForSessionCount(20)).toBeGreaterThan(personalWeightForSessionCount(10));
    expect(personalWeightForSessionCount(400)).toBe(0.65);
  });
});
