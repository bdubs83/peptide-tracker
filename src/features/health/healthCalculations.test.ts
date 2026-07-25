import { describe, expect, it } from "vitest";
import { calculateAge, calculateBmi, calculateRmr, estimateStepCalories } from "./healthCalculations";

describe("health calculations", () => {
  it("calculates age around the birthday", () => {
    expect(calculateAge("1990-07-16", new Date("2026-07-15T12:00:00"))).toBe(35);
    expect(calculateAge("1990-07-15", new Date("2026-07-15T12:00:00"))).toBe(36);
  });

  it("calculates BMI using metric inputs", () => {
    expect(calculateBmi(80, 180)).toBeCloseTo(24.69, 2);
  });

  it("uses the Mifflin-St Jeor resting-energy equation", () => {
    expect(calculateRmr(80, 180, 40, "male")).toBeCloseTo(1730, 0);
    expect(calculateRmr(65, 165, 40, "female")).toBeCloseTo(1320.25, 2);
    expect(calculateRmr(65, 165, 40, "unspecified")).toBeNull();
  });

  it("estimates step calories from distance when available", () => {
    expect(estimateStepCalories(10000, 80, 7)).toBe(280);
    expect(estimateStepCalories(10000, 80)).toBe(400);
  });
});
