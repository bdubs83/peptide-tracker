import type { DoseUnit } from "./peptide";

export type VialAdjustmentReason =
  | "familyFriend"
  | "spillage"
  | "primingLoss"
  | "measurementCorrection"
  | "transferToPen"
  | "discarded"
  | "other";

export type VialAdjustmentInputUnit = DoseUnit | "mL" | "units";

export interface VialAdjustment {
  id: string;
  peptideId: string;
  vaultUserId?: string;
  openVialId?: string;
  peptideNameSnapshot: string;
  adjustmentDate: string;
  amountValue: number;
  amountUnit: VialAdjustmentInputUnit;
  amountMcg: number;
  reason: VialAdjustmentReason;
  personLabel?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
