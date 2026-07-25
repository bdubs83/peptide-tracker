export type DoseUnit = "mcg" | "mg";
export type HalfLifeUnit = "hours" | "days";
export type OpenContainerType = "vial" | "pen";

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

  /** Oil-based products (for example testosterone) do not use reconstitution. */
  isOilBased?: boolean;
  oilVolumeMl?: number;

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

  /** Vials are the default. Pens are active containers filled from a vial. */
  containerType?: OpenContainerType;
  /** An internal container record, not a user's protocol. */
  isContainerOnly?: boolean;
  containerLabel?: string;
  sharedWithUserIds?: string[];

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
