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

  // Scheduled logs fulfill a dose-plan occurrence. Ad-hoc logs are standalone
  // injections and must not replace a scheduled dose on the same day.
  entryType?: "scheduled" | "adHoc";

  /** Explicitly links a dose to inventory, including deliberately backdated doses. */
  inventoryAssignment?: "assigned" | "unassigned" | "historical";

  injectionSiteId?: string;
  injectionSiteLabel?: string;
  injectionSiteSide?: "front" | "back";

  notes?: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
