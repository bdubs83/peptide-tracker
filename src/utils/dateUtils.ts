import type { Peptide } from "../types/peptide";
import type { DoseSchedulePhase, PeptideSchedule } from "../types/schedule";
import type { InjectionLog } from "../types/injectionLog";
import { normalizeDoseToMcg } from "../features/calculator/calculatorUtils";

interface DoseScheduleOccurrence {
  date: string;
  phase: DoseSchedulePhase;
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export function isScheduledDate(schedule: PeptideSchedule, dateStr: string): boolean {
  if (!schedule.isActive) return false;

  // If a start date is specified, the date must be >= startDate
  if (schedule.startDate && dateStr < schedule.startDate) {
    return false;
  }

  // If last injection date is specified, the date must be > lastInjectionDate
  if (schedule.lastInjectionDate && dateStr <= schedule.lastInjectionDate) {
    return false;
  }

  if (schedule.scheduleType === "everyXDays") {
    const interval = schedule.intervalDays || 1;
    let anchor: string;
    if (schedule.lastInjectionDate) {
      anchor = schedule.lastInjectionDate;
    } else if (schedule.startDate) {
      anchor = schedule.startDate;
    } else {
      return false;
    }

    const anchorDate = parseLocalDate(anchor);
    const checkDate = parseLocalDate(dateStr);

    const diffTime = checkDate.getTime() - anchorDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return false;

    if (schedule.lastInjectionDate) {
      return diffDays > 0 && diffDays % interval === 0;
    } else {
      return diffDays % interval === 0;
    }
  } else if (schedule.scheduleType === "daysOfWeek") {
    const days = schedule.daysOfWeek || [];
    if (days.length === 0) return false;

    const checkDate = parseLocalDate(dateStr);
    const dayOfWeek = checkDate.getDay();
    return days.includes(dayOfWeek);
  }

  return false;
}

export function getNextInjectionDate(
  schedule: PeptideSchedule,
  fromDateStr: string,
  loggedDates: Set<string> = new Set()
): string {
  if (!schedule.isActive) return "";

  if (schedule.scheduleType === "everyXDays") {
    const interval = schedule.intervalDays || 1;
    let anchor: string;
    let startK: number;
    if (schedule.lastInjectionDate) {
      anchor = schedule.lastInjectionDate;
      startK = 1;
    } else if (schedule.startDate) {
      anchor = schedule.startDate;
      startK = 0;
    } else {
      return fromDateStr;
    }

    let k = startK;
    while (true) {
      const anchorDate = parseLocalDate(anchor);
      anchorDate.setDate(anchorDate.getDate() + k * interval);
      const candidateStr = getLocalDateString(anchorDate);

      if (candidateStr >= fromDateStr) {
        if (candidateStr === fromDateStr && loggedDates.has(candidateStr)) {
          k++;
          continue;
        }
        return candidateStr;
      }
      k++;
      if (k > 10000) break;
    }
    return fromDateStr;
  } else if (schedule.scheduleType === "daysOfWeek") {
    const days = schedule.daysOfWeek || [];
    if (days.length === 0) return "";

    const fromDate = parseLocalDate(fromDateStr);
    const checkDate = new Date(fromDate.getTime());

    for (let i = 0; i < 365; i++) {
      const checkStr = getLocalDateString(checkDate);
      const dayOfWeek = checkDate.getDay();

      if (days.includes(dayOfWeek)) {
        if (checkStr === fromDateStr && loggedDates.has(checkStr)) {
          checkDate.setDate(checkDate.getDate() + 1);
          continue;
        }

        if (schedule.startDate && checkStr < schedule.startDate) {
          checkDate.setDate(checkDate.getDate() + 1);
          continue;
        }

        return checkStr;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
  }
  return "";
}

export function getUpcomingInjectionDates(
  schedule: PeptideSchedule,
  startDateStr: string,
  endDateStr: string
): string[] {
  if (!schedule.isActive) return [];

  if (hasDoseSchedule(schedule)) {
    const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || startDateStr;
    return getDoseScheduleOccurrences(schedule, phaseStart, endDateStr)
      .map((occurrence) => occurrence.date)
      .filter((date) => date >= startDateStr && date <= endDateStr);
  }

  const dates: string[] = [];
  const checkDate = parseLocalDate(startDateStr);

  while (true) {
    const checkStr = getLocalDateString(checkDate);
    if (checkStr > endDateStr) break;

    if (isScheduledDate(schedule, checkStr)) {
      dates.push(checkStr);
    }

    checkDate.setDate(checkDate.getDate() + 1);
    if (dates.length > 500) break;
  }

  return dates;
}

export function getDoseScheduleOccurrences(
  schedule: PeptideSchedule,
  startDateStr: string,
  endDateStr: string
): DoseScheduleOccurrence[] {
  if (!schedule.isActive || startDateStr > endDateStr) return [];

  const dosePhases = (schedule.doseSchedule || []).filter((phase) => phase.doseValue > 0);
  if (dosePhases.length === 0) return [];

  const occurrences: DoseScheduleOccurrence[] = [];
  let phaseIndex = 0;
  let phaseStartDate = startDateStr;
  let injectionsInPhase = 0;
  let currentDate = startDateStr;

  while (currentDate <= endDateStr && phaseIndex < dosePhases.length) {
    const phase = dosePhases[phaseIndex];

    if (
      !phase.isContinuous &&
      (phase.durationType === "weeks" || phase.durationType === "daysOfWeek") &&
      phase.durationValue &&
      currentDate >= addDays(phaseStartDate, phase.durationValue * 7)
    ) {
      if (phaseIndex < dosePhases.length - 1) {
        phaseIndex += 1;
        phaseStartDate = currentDate;
        injectionsInPhase = 0;
        continue;
      }
      break;
    }

    const currentDay = parseLocalDate(currentDate).getDay();
    const phaseSchedule: PeptideSchedule = {
      ...schedule,
      scheduleType: phase.durationType === "daysOfWeek" ? "daysOfWeek" : "everyXDays",
      intervalDays: phase.durationType === "injections" ? phase.intervalDays || schedule.intervalDays || 1 : schedule.intervalDays,
      daysOfWeek: phase.durationType === "daysOfWeek" ? phase.daysOfWeek || [] : schedule.daysOfWeek,
      startDate: phaseStartDate,
      lastInjectionDate: undefined,
    };
    const daysSincePhaseStart = Math.round(
      (parseLocalDate(currentDate).getTime() - parseLocalDate(phaseStartDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const isDoseDate =
      phase.durationType === "daysOfWeek"
        ? (phase.daysOfWeek || []).includes(currentDay)
        : phase.durationType === "weeks"
        ? daysSincePhaseStart >= 0 && daysSincePhaseStart % 7 === 0
        : isScheduledDate(phaseSchedule, currentDate);

    if (isDoseDate) {
      occurrences.push({ date: currentDate, phase });

      if (!phase.isContinuous && phase.durationType === "injections") {
        injectionsInPhase += 1;
        const durationValue = phase.durationValue || 0;
        if (durationValue > 0 && injectionsInPhase >= durationValue) {
          if (phaseIndex < dosePhases.length - 1) {
            phaseIndex += 1;
            phaseStartDate = addDays(currentDate, 1);
            injectionsInPhase = 0;
          } else {
            break;
          }
        }
      }
    }

    currentDate = addDays(currentDate, 1);
    if (occurrences.length > 10000) break;
  }

  return occurrences;
}

export function hasDoseSchedule(schedule?: PeptideSchedule): boolean {
  return Boolean(schedule?.doseSchedule?.some((phase) => phase.doseValue > 0));
}

export function getWeekBasedDoseScheduleStockProjection(
  schedule: PeptideSchedule,
  totalMcg: number,
  fromDateStr = getLocalDateString()
) {
  const phases = (schedule.doseSchedule || []).filter((phase) => phase.doseValue > 0);
  if (phases.length === 0) return null;
  if (phases.some((phase) => phase.durationType === "injections")) return null;

  let remainingMcg = totalMcg;
  let daysUntilEmpty = 0;
  let dosePeriods = 0;

  for (const [index, phase] of phases.entries()) {
    const doseMcg = normalizeDoseToMcg(phase.doseValue, phase.doseUnit);
    if (doseMcg <= 0) return null;

    const weeklyDoseMcg =
      phase.durationType === "daysOfWeek"
        ? doseMcg * Math.max(1, phase.daysOfWeek?.length || 0)
        : doseMcg;
    if (weeklyDoseMcg <= 0) return null;

    const isContinuous = phase.isContinuous || index === phases.length - 1 || !phase.durationValue;
    const phaseWeeks = isContinuous ? Infinity : phase.durationValue || 0;

    if (!Number.isFinite(phaseWeeks)) {
      daysUntilEmpty += Math.ceil((remainingMcg / weeklyDoseMcg) * 7);
      dosePeriods +=
        phase.durationType === "daysOfWeek"
          ? Math.floor(remainingMcg / doseMcg)
          : Math.floor(remainingMcg / weeklyDoseMcg);
      remainingMcg = 0;
      break;
    }

    const phaseCapacityMcg = weeklyDoseMcg * phaseWeeks;
    if (remainingMcg <= phaseCapacityMcg) {
      daysUntilEmpty += Math.ceil((remainingMcg / weeklyDoseMcg) * 7);
      dosePeriods +=
        phase.durationType === "daysOfWeek"
          ? Math.floor(remainingMcg / doseMcg)
          : Math.floor(remainingMcg / weeklyDoseMcg);
      remainingMcg = 0;
      break;
    }

    remainingMcg -= phaseCapacityMcg;
    daysUntilEmpty += phaseWeeks * 7;
    dosePeriods +=
      phase.durationType === "daysOfWeek"
        ? phaseWeeks * Math.max(1, phase.daysOfWeek?.length || 0)
        : phaseWeeks;
  }

  if (remainingMcg > 0) return null;

  return {
    injectionCount: Math.max(0, Math.floor(dosePeriods)),
    daysUntilEmpty: Math.max(0, daysUntilEmpty),
    emptyDate: addDays(fromDateStr, Math.max(0, daysUntilEmpty)),
  };
}

export function getNextScheduledDoseDate(
  schedule: PeptideSchedule,
  fromDateStr: string,
  loggedDates: Set<string> = new Set()
): string {
  if (!hasDoseSchedule(schedule)) {
    return getNextInjectionDate(schedule, fromDateStr, loggedDates);
  }

  const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || fromDateStr;
  const searchStart = fromDateStr < phaseStart ? phaseStart : fromDateStr;
  const occurrences = getDoseScheduleOccurrences(schedule, phaseStart, addDays(searchStart, 10000));
  const nextOccurrence = occurrences.find(
    (occurrence) => occurrence.date >= searchStart && !loggedDates.has(occurrence.date)
  );

  return nextOccurrence?.date || "";
}

export function getDaysUntilNextScheduledDose(
  schedule: PeptideSchedule,
  fromDateStr = getLocalDateString(),
  loggedDates: Set<string> = new Set()
): number | null {
  const nextDateStr = getNextScheduledDoseDate(schedule, fromDateStr, loggedDates);
  if (!nextDateStr) return null;

  const nextDate = parseLocalDate(nextDateStr);
  const fromDate = parseLocalDate(fromDateStr);
  const diffTime = nextDate.getTime() - fromDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getScheduledDoseForDate(
  peptide: Peptide,
  schedule: PeptideSchedule,
  targetDateStr: string
): { doseValue: number; doseUnit: Peptide["desiredDoseUnit"] } {
  const dosePhases = (schedule.doseSchedule || []).filter((phase) => phase.doseValue > 0);
  if (dosePhases.length === 0) {
    return {
      doseValue: peptide.desiredDoseValue,
      doseUnit: peptide.desiredDoseUnit,
    };
  }

  const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate;
  if (!phaseStart || targetDateStr < phaseStart) {
    const firstPhase = dosePhases[0];
    return {
      doseValue: firstPhase.doseValue,
      doseUnit: firstPhase.doseUnit,
    };
  }

  const occurrence = getDoseScheduleOccurrences(schedule, phaseStart, targetDateStr).find(
    (item) => item.date === targetDateStr
  );
  if (!occurrence) {
    return {
      doseValue: peptide.desiredDoseValue,
      doseUnit: peptide.desiredDoseUnit,
    };
  }

  const fallbackPhase = occurrence.phase;
  return {
    doseValue: fallbackPhase.doseValue,
    doseUnit: fallbackPhase.doseUnit,
  };
}

export function isCurrentVialLog(peptide: Peptide, log: InjectionLog): boolean {
  if (!peptide.currentVialStartedAt) return true;
  const logTime = log.createdAt || log.actualDateTime;
  return Boolean(logTime && logTime >= peptide.currentVialStartedAt);
}

export function getCurrentVialLogs(peptide: Peptide, injectionLogs: InjectionLog[]): InjectionLog[] {
  const openVialId = peptide.openVialId || peptide.id;
  return injectionLogs.filter((log) => {
    const matchesVial = log.openVialId ? log.openVialId === openVialId : log.peptideId === peptide.id;
    return matchesVial && isCurrentVialLog(peptide, log);
  });
}

export function getEstimatedRemainingDoses(
  peptide: Peptide,
  schedule: PeptideSchedule,
  injectionLogs: InjectionLog[],
  fromDateStr = getLocalDateString()
): number {
  const currentVialLogs = getCurrentVialLogs(peptide, injectionLogs);
  const relevantLogs = currentVialLogs.filter(
    (log) => log.status === "taken" || log.status === "manual"
  );
  const totalTakenMcg = relevantLogs.reduce((sum, log) => {
    return sum + normalizeDoseToMcg(log.doseValue, log.doseUnit);
  }, 0);

  let remainingMcg = Math.max(0, peptide.vialMg * 1000 - totalTakenMcg);
  if (remainingMcg <= 0) return 0;

  const loggedScheduledDates = new Set(
    currentVialLogs
      .filter((log) => log.status !== "scheduled")
      .map((log) => log.scheduledDate)
  );

  let count = 0;

  if (hasDoseSchedule(schedule)) {
    const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || fromDateStr;
    const occurrences = getDoseScheduleOccurrences(schedule, phaseStart, addDays(fromDateStr, 10000)).filter(
      (occurrence) => occurrence.date >= fromDateStr && !loggedScheduledDates.has(occurrence.date)
    );

    for (const occurrence of occurrences) {
      const doseMcg = normalizeDoseToMcg(occurrence.phase.doseValue, occurrence.phase.doseUnit);
      if (doseMcg <= 0) break;
      remainingMcg -= doseMcg;
      count += 1;
      if (remainingMcg <= 0) return count;
    }

    return count;
  }

  const defaultDoseMcg = normalizeDoseToMcg(peptide.desiredDoseValue, peptide.desiredDoseUnit);
  return defaultDoseMcg > 0 ? Math.floor(remainingMcg / defaultDoseMcg) : 0;
}

export function getDaysUntilNextInjection(
  schedule: PeptideSchedule,
  fromDateStr = getLocalDateString(),
  loggedDates: Set<string> = new Set()
): number | null {
  const nextDateStr = getNextInjectionDate(schedule, fromDateStr, loggedDates);
  if (!nextDateStr) return null;

  const nextDate = parseLocalDate(nextDateStr);
  const fromDate = parseLocalDate(fromDateStr);

  const diffTime = nextDate.getTime() - fromDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getEstimatedEmptyDate(
  peptide: Peptide,
  schedule: PeptideSchedule,
  injectionLogs: InjectionLog[],
  fromDateStr = getLocalDateString()
): string | null {
  if (!schedule.isActive) return null;

  const currentVialLogs = getCurrentVialLogs(peptide, injectionLogs);

  // Filter logs for this peptide with status 'taken' or 'manual'
  const relevantLogs = currentVialLogs.filter(
    (log) => log.status === "taken" || log.status === "manual"
  );

  // Calculate total peptide amount taken (in mcg)
  const totalTakenMcg = relevantLogs.reduce((sum, log) => {
    const amountMcg = normalizeDoseToMcg(log.doseValue, log.doseUnit);
    return sum + amountMcg;
  }, 0);

  const totalVialMcg = peptide.vialMg * 1000;
  let remainingMcg = Math.max(0, totalVialMcg - totalTakenMcg);

  if (remainingMcg <= 0) {
    return fromDateStr; // empty now or before next injection
  }

  const dosePhases = (schedule.doseSchedule || []).filter((phase) => phase.doseValue > 0);
  const hasDoseSchedule = dosePhases.length > 0;

  const defaultDoseMcg = normalizeDoseToMcg(peptide.desiredDoseValue, peptide.desiredDoseUnit);
  if (!hasDoseSchedule && defaultDoseMcg <= 0) return null;

  // Create set of logged scheduled dates so we don't double count
  const loggedScheduledDates = new Set(
    currentVialLogs
      .filter((log) => log.status !== "scheduled")
      .map((log) => log.scheduledDate)
  );

  if (hasDoseSchedule) {
    const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || fromDateStr;
    const occurrences = getDoseScheduleOccurrences(schedule, phaseStart, addDays(fromDateStr, 10000)).filter(
      (occurrence) => occurrence.date >= fromDateStr && !loggedScheduledDates.has(occurrence.date)
    );

    for (const occurrence of occurrences) {
      const doseMcg = normalizeDoseToMcg(occurrence.phase.doseValue, occurrence.phase.doseUnit);
      if (doseMcg <= 0) return null;

      remainingMcg -= doseMcg;
      if (remainingMcg <= 0) return occurrence.date;
    }

    return null;
  }

  let currentDate = fromDateStr;
  for (let i = 0; i < 10000; i++) {
    const nextDate = getNextInjectionDate(schedule, currentDate, loggedScheduledDates);
    if (!nextDate) break;

    const scheduledDose = getScheduledDoseForDate(peptide, schedule, nextDate);
    const doseMcg = normalizeDoseToMcg(scheduledDose.doseValue, scheduledDose.doseUnit);

    if (doseMcg <= 0) return null;

    remainingMcg -= doseMcg;
    if (remainingMcg <= 0) return nextDate;

    loggedScheduledDates.add(nextDate);
    currentDate = addDays(nextDate, 1);
  }

  return null;
}

export function getSharedOpenVialProjection(
  openVialPeptide: Peptide,
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  injectionLogs: InjectionLog[],
  fromDateStr = getLocalDateString()
): { injectionCount: number; emptyDate: string | null } {
  const openVialId = openVialPeptide.openVialId || openVialPeptide.id;
  const currentVialLogs = getCurrentVialLogs(openVialPeptide, injectionLogs);
  const totalTakenMcg = currentVialLogs
    .filter((log) => log.status === "taken" || log.status === "manual")
    .reduce((sum, log) => sum + normalizeDoseToMcg(log.doseValue, log.doseUnit), 0);

  let remainingMcg = Math.max(0, openVialPeptide.vialMg * 1000 - totalTakenMcg);
  if (remainingMcg <= 0) return { injectionCount: 0, emptyDate: fromDateStr };

  const peptidesById = new Map(peptides.map((peptide) => [peptide.id, peptide]));
  const schedulesForVial = schedules.filter((schedule) => {
    if (!schedule.isActive) return false;
    if (schedule.openVialId) return schedule.openVialId === openVialId;
    return schedule.peptideId === openVialPeptide.id;
  });

  type ProjectedDose = {
    date: string;
    doseMcg: number;
    key: string;
  };

  const projectedDoses: ProjectedDose[] = [];
  for (const schedule of schedulesForVial) {
    const peptide = peptidesById.get(schedule.peptideId);
    if (!peptide) continue;

    const logsForSchedule = currentVialLogs.filter((log) => log.peptideId === schedule.peptideId);
    const loggedScheduledDates = new Set(
      logsForSchedule.filter((log) => log.status !== "scheduled").map((log) => log.scheduledDate)
    );

    if (hasDoseSchedule(schedule)) {
      const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || fromDateStr;
      const occurrences = getDoseScheduleOccurrences(schedule, phaseStart, addDays(fromDateStr, 10000)).filter(
        (occurrence) => occurrence.date >= fromDateStr && !loggedScheduledDates.has(occurrence.date)
      );

      for (const occurrence of occurrences) {
        const doseMcg = normalizeDoseToMcg(occurrence.phase.doseValue, occurrence.phase.doseUnit);
        if (doseMcg > 0) {
          projectedDoses.push({
            date: occurrence.date,
            doseMcg,
            key: `${schedule.id}|${occurrence.date}`,
          });
        }
      }
      continue;
    }

    let currentDate = fromDateStr;
    for (let i = 0; i < 10000; i++) {
      const nextDate = getNextInjectionDate(schedule, currentDate, loggedScheduledDates);
      if (!nextDate) break;

      const scheduledDose = getScheduledDoseForDate(peptide, schedule, nextDate);
      const doseMcg = normalizeDoseToMcg(scheduledDose.doseValue, scheduledDose.doseUnit);
      if (doseMcg > 0) {
        projectedDoses.push({
          date: nextDate,
          doseMcg,
          key: `${schedule.id}|${nextDate}`,
        });
      }

      loggedScheduledDates.add(nextDate);
      currentDate = addDays(nextDate, 1);
    }
  }

  projectedDoses.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));

  let injectionCount = 0;
  for (const projectedDose of projectedDoses) {
    remainingMcg -= projectedDose.doseMcg;
    injectionCount += 1;
    if (remainingMcg <= 0) {
      return {
        injectionCount,
        emptyDate: projectedDose.date,
      };
    }
  }

  return {
    injectionCount,
    emptyDate: null,
  };
}
