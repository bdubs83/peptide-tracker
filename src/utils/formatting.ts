import type { DoseUnit } from "../types/peptide";

export function formatMl(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0.000 mL";
  return value.toFixed(3) + " mL";
}

export function formatUnits(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0.0 units";
  return value.toFixed(1) + " units";
}

export function formatMgPerMl(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0.00 mg/mL";
  return value.toFixed(2) + " mg/mL";
}

export function formatMcgPerMl(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0 mcg/mL";
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return formatted + " mcg/mL";
}

export function formatDose(value: number, unit: DoseUnit): string {
  if (isNaN(value) || !isFinite(value)) return `0 ${unit}`;
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${formatted} ${unit}`;
}

export function formatDosesPerVial(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0.0";
  return value.toFixed(1);
}

export function formatPercentOfVial(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0.00%";
  return value.toFixed(2) + "%";
}
