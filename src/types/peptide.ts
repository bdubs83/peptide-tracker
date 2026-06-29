export type DoseUnit = "mcg" | "mg";
export type HalfLifeUnit = "hours" | "days";

export interface Peptide {
  id: string;
  name: string;

  vialMg: number;
  bacWaterMl: number;

  desiredDoseValue: number;
  desiredDoseUnit: DoseUnit;

  syringeSizeMl: number;
  unitsPerMl: number;

  concentrationMgPerMl: number;
  concentrationMcgPerMl: number;
  doseMl: number;
  doseUnits: number;
  estimatedDosesPerVial: number;
  percentOfVialPerDose: number;

  halfLifeHours?: number;
  halfLifeUnit?: HalfLifeUnit;

  notes?: string;
  currentVialStartedAt?: string;
  currentVialTotalMg?: number;
  efficacyVerifiedAt?: string;
  sourceStockItemId?: string;
  sourceOpenVialId?: string;
  vaultUserId?: string;
  openVialId?: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
