import type { PeptideSchedule } from "../types/schedule";

const scheduleSortDate = (schedule: PeptideSchedule) => schedule.updatedAt || schedule.createdAt || "";

export function preferSchedule(current: PeptideSchedule | undefined, candidate: PeptideSchedule) {
  if (!current) return candidate;
  if (candidate.isActive !== current.isActive) return candidate.isActive ? candidate : current;
  return scheduleSortDate(candidate) >= scheduleSortDate(current) ? candidate : current;
}

export function getPreferredSchedule(schedules: PeptideSchedule[], peptideId: string) {
  return schedules
    .filter((schedule) => schedule.peptideId === peptideId)
    .reduce<PeptideSchedule | undefined>((current, schedule) => preferSchedule(current, schedule), undefined);
}

export function makePreferredScheduleMap(schedules: PeptideSchedule[]) {
  const map = new Map<string, PeptideSchedule>();
  for (const schedule of schedules) {
    map.set(schedule.peptideId, preferSchedule(map.get(schedule.peptideId), schedule));
  }
  return map;
}
