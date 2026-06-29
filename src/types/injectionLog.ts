import type { DoseUnit } from "./peptide";

export interface InjectionLog {
  id: string;
  peptideId: string;
  vaultUserId?: string;
  openVialId?: string;

  peptideNameSnapshot: string;

  scheduledDate: string; // YYYY-MM-DD
  actualDateTime?: string; // ISO 8601 string

  doseValue: number;
  doseUnit: DoseUnit;

  drawMl: number;
  drawUnits: number;

  status: "scheduled" | "taken" | "skipped" | "missed" | "manual";

  injectionSiteId?: string;
  injectionSiteLabel?: string;
  injectionSiteSide?: "front" | "back";

  notes?: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
