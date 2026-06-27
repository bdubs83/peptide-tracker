import { describe, it, expect } from "vitest";
import { normalizeDoseToMcg, calculateReconstitution, solveReconstitutionInput } from "./calculatorUtils";

describe("calculatorUtils", () => {
  describe("normalizeDoseToMcg", () => {
    it("should normalize mcg value directly", () => {
      expect(normalizeDoseToMcg(250, "mcg")).toBe(250);
    });

    it("should convert mg to mcg by multiplying by 1000", () => {
      expect(normalizeDoseToMcg(2.5, "mg")).toBe(2500);
    });
  });

  describe("calculateReconstitution", () => {
    it("should correctly calculate values for a standard dose of BPC-157", () => {
      // 5mg vial, 2mL water, 250 mcg desired dose, 100 units/mL syringe
      const result = calculateReconstitution({
        peptideMg: 5,
        bacWaterMl: 2,
        desiredDoseValue: 250,
        desiredDoseUnit: "mcg",
        unitsPerMl: 100,
      });

      // concentrationMgPerMl = 5 / 2 = 2.5 mg/mL
      expect(result.concentrationMgPerMl).toBe(2.5);

      // concentrationMcgPerMl = 2.5 * 1000 = 2500 mcg/mL
      expect(result.concentrationMcgPerMl).toBe(2500);

      // doseMl = 250 mcg / 2500 mcg/mL = 0.1 mL
      expect(result.doseMl).toBe(0.1);

      // doseUnits = 0.1 * 100 = 10 units
      expect(result.doseUnits).toBe(10);

      // estimatedDosesPerVial = 5000 mcg / 250 mcg = 20 doses
      expect(result.estimatedDosesPerVial).toBe(20);

      // percentOfVialPerDose = (250 / 5000) * 100 = 5%
      expect(result.percentOfVialPerDose).toBe(5);
    });

    it("should calculate dose in mL correctly", () => {
      const result = calculateReconstitution({
        peptideMg: 10,
        bacWaterMl: 2,
        desiredDoseValue: 1,
        desiredDoseUnit: "mg", // 1000 mcg
        unitsPerMl: 100,
      });

      // concentrationMgPerMl = 10 / 2 = 5 mg/mL
      // doseMl = 1mg / 5mg/mL = 0.2 mL
      expect(result.doseMl).toBe(0.2);
      expect(result.doseUnits).toBe(20);
    });
  });

  describe("solveReconstitutionInput", () => {
    it("should solve draw amount when peptide, water, and dose are provided", () => {
      const result = solveReconstitutionInput({
        peptideMg: 5,
        bacWaterMl: 2,
        desiredDoseValue: 250,
        desiredDoseUnit: "mcg",
        syringeDisplayMode: "units",
        unitsPerMl: 100,
      });

      expect(result).toEqual({ field: "drawAmount", value: 10 });
    });

    it("should solve bac water when peptide, dose, and draw amount are provided", () => {
      const result = solveReconstitutionInput({
        peptideMg: 80,
        desiredDoseValue: 2.7,
        desiredDoseUnit: "mg",
        drawAmount: 10,
        syringeDisplayMode: "units",
        unitsPerMl: 100,
      });

      expect(result?.field).toBe("bacWaterMl");
      expect(result?.value).toBeCloseTo(2.963, 3);
    });

    it("should solve desired dose when peptide, water, and draw amount are provided", () => {
      const result = solveReconstitutionInput({
        peptideMg: 80,
        bacWaterMl: 3,
        desiredDoseUnit: "mg",
        drawAmount: 10,
        syringeDisplayMode: "units",
        unitsPerMl: 100,
      });

      expect(result?.field).toBe("desiredDoseValue");
      expect(result?.value).toBeCloseTo(2.667, 3);
    });
  });
});
