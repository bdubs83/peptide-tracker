export function normalizeDoseToMcg(value: number, unit: "mcg" | "mg"): number {
  return unit === "mg" ? value * 1000 : value;
}

export function calculateReconstitution(params: {
  peptideMg: number;
  bacWaterMl: number;
  desiredDoseValue: number;
  desiredDoseUnit: "mcg" | "mg";
  unitsPerMl?: number;
}) {
  const unitsPerMl = params.unitsPerMl ?? 100;

  const desiredDoseMcg = normalizeDoseToMcg(
    params.desiredDoseValue,
    params.desiredDoseUnit
  );

  const concentrationMgPerMl = params.peptideMg / params.bacWaterMl;
  const concentrationMcgPerMl = concentrationMgPerMl * 1000;

  const doseMl = desiredDoseMcg / concentrationMcgPerMl;
  const doseUnits = doseMl * unitsPerMl;

  const totalPeptideMcg = params.peptideMg * 1000;
  const estimatedDosesPerVial = totalPeptideMcg / desiredDoseMcg;

  const percentOfVialPerDose = (desiredDoseMcg / totalPeptideMcg) * 100;

  return {
    concentrationMgPerMl,
    concentrationMcgPerMl,
    doseMl,
    doseUnits,
    estimatedDosesPerVial,
    percentOfVialPerDose,
  };
}

export type ReconstitutionSolveField = "bacWaterMl" | "desiredDoseValue" | "drawAmount";

export function drawAmountToMl(value: number, displayMode: "mL" | "units", unitsPerMl: number): number {
  return displayMode === "units" ? value / unitsPerMl : value;
}

export function drawMlToAmount(valueMl: number, displayMode: "mL" | "units", unitsPerMl: number): number {
  return displayMode === "units" ? valueMl * unitsPerMl : valueMl;
}

export function solveReconstitutionInput(params: {
  peptideMg: number;
  bacWaterMl?: number;
  desiredDoseValue?: number;
  desiredDoseUnit: "mcg" | "mg";
  drawAmount?: number;
  syringeDisplayMode: "mL" | "units";
  unitsPerMl: number;
}): { field: ReconstitutionSolveField; value: number } | null {
  const { peptideMg, bacWaterMl, desiredDoseValue, desiredDoseUnit, drawAmount, syringeDisplayMode, unitsPerMl } = params;
  if (peptideMg <= 0 || unitsPerMl <= 0) return null;

  const hasBacWater = bacWaterMl !== undefined && bacWaterMl > 0;
  const hasDose = desiredDoseValue !== undefined && desiredDoseValue > 0;
  const hasDraw = drawAmount !== undefined && drawAmount > 0;

  if (hasBacWater && hasDose && !hasDraw) {
    const result = calculateReconstitution({
      peptideMg,
      bacWaterMl,
      desiredDoseValue,
      desiredDoseUnit,
      unitsPerMl,
    });
    return {
      field: "drawAmount",
      value: drawMlToAmount(result.doseMl, syringeDisplayMode, unitsPerMl),
    };
  }

  if (hasDose && hasDraw && !hasBacWater) {
    const desiredDoseMg = normalizeDoseToMcg(desiredDoseValue, desiredDoseUnit) / 1000;
    const drawMl = drawAmountToMl(drawAmount, syringeDisplayMode, unitsPerMl);
    if (desiredDoseMg <= 0 || drawMl <= 0) return null;
    return {
      field: "bacWaterMl",
      value: (drawMl * peptideMg) / desiredDoseMg,
    };
  }

  if (hasBacWater && hasDraw && !hasDose) {
    const drawMl = drawAmountToMl(drawAmount, syringeDisplayMode, unitsPerMl);
    if (drawMl <= 0) return null;
    const concentrationMgPerMl = peptideMg / bacWaterMl;
    const doseMg = concentrationMgPerMl * drawMl;
    return {
      field: "desiredDoseValue",
      value: desiredDoseUnit === "mcg" ? doseMg * 1000 : doseMg,
    };
  }

  return null;
}
