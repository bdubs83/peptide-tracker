import type { DoseUnit } from "./peptide";

export type DoseScheduleDurationType = "injections" | "weeks" | "daysOfWeek";

export interface DoseSchedulePhase {
  id: string;
  startDate?: string;
  durationType: DoseScheduleDurationType;
  durationValue?: number;
  intervalDays?: number;
  daysOfWeek?: number[];
  doseValue: number;
  doseUnit: DoseUnit;
  isContinuous?: boolean;
}

export interface PeptideSchedule {
  id: string;
  peptideId: string;
  vaultUserId?: string;
  openVialId?: string;

  scheduleType: "daysOfWeek" | "everyXDays";

  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  intervalDays?: number;

  startDate?: string;       // YYYY-MM-DD
  lastInjectionDate?: string; // YYYY-MM-DD
  injectionTime?: string; // HH:mm

  cycleEnabled?: boolean;
  cycleWeeksOn?: number;
  cycleWeeksOff?: number;
  doseScheduleStartDate?: string;
  doseSchedule?: DoseSchedulePhase[];

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
