import type { Peptide } from "../types/peptide";
import type { DoseSchedulePhase, PeptideSchedule } from "../types/schedule";
import { addDays, getLocalDateString } from "./dateUtils";

const makePhaseId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `phase-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function getLegacyScheduleFirstDoseDate(schedule: PeptideSchedule): string | undefined {
  if (schedule.startDate) return schedule.startDate;

  if (!schedule.lastInjectionDate) return undefined;

  if (schedule.scheduleType === "everyXDays") {
    return addDays(schedule.lastInjectionDate, Math.max(1, schedule.intervalDays || 1));
  }

  return addDays(schedule.lastInjectionDate, 1);
}

export function buildContinuousDoseSchedulePhase(
  schedule: PeptideSchedule,
  peptide: Pick<Peptide, "desiredDoseValue" | "desiredDoseUnit">
): DoseSchedulePhase {
  const isDaySpecific = schedule.scheduleType === "daysOfWeek";

  return {
    id: makePhaseId(),
    durationType: isDaySpecific ? "daysOfWeek" : "injections",
    intervalDays: isDaySpecific ? undefined : Math.max(1, schedule.intervalDays || 1),
    daysOfWeek: isDaySpecific ? schedule.daysOfWeek || [] : undefined,
    doseValue: peptide.desiredDoseValue,
    doseUnit: peptide.desiredDoseUnit,
    isContinuous: true,
  };
}

export function scheduleNeedsDoseSchedule(schedule?: PeptideSchedule): schedule is PeptideSchedule {
  return Boolean(schedule && !schedule.doseSchedule?.some((phase) => phase.doseValue > 0));
}

export function convertLegacyScheduleToDoseSchedule(
  schedule: PeptideSchedule,
  peptide: Pick<Peptide, "desiredDoseValue" | "desiredDoseUnit">
): PeptideSchedule {
  if (!scheduleNeedsDoseSchedule(schedule)) return schedule;

  return {
    ...schedule,
    doseScheduleStartDate:
      schedule.doseScheduleStartDate || getLegacyScheduleFirstDoseDate(schedule) || getLocalDateString(),
    doseSchedule: [buildContinuousDoseSchedulePhase(schedule, peptide)],
  };
}
