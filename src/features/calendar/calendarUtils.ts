import {
  getLocalDateString,
  parseLocalDate,
  addDays,
  isScheduledDate,
  getDoseScheduleOccurrences,
  hasDoseSchedule,
} from "../../utils/dateUtils";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { InjectionLog } from "../../types/injectionLog";

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  dayNumber: number;
  isToday: boolean;
}

export interface DayEvent {
  peptide: Peptide;
  schedule?: PeptideSchedule;
  log?: InjectionLog;
  status: "due" | "completed" | "skipped" | "missed" | "upcoming" | "none";
}

const getStatusForDate = (
  dateStr: string,
  todayStr: string,
  scheduled: boolean,
  log?: InjectionLog
): DayEvent["status"] => {
  if (log) {
    if (log.status === "taken" || log.status === "manual") return "completed";
    if (log.status === "skipped") return "skipped";
    if (log.status === "missed") return "missed";
    if (log.status === "scheduled") {
      if (dateStr < todayStr) return "missed";
      if (dateStr === todayStr) return "due";
      return "upcoming";
    }
  }

  if (!scheduled) return "none";
  if (dateStr < todayStr) return "missed";
  if (dateStr === todayStr) return "due";
  return "upcoming";
};

const getDateRange = (startDateStr: string, endDateStr: string) => {
  const dates: string[] = [];
  let cursor = startDateStr;

  while (cursor <= endDateStr) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
};

// Generates a grid of dates for the monthly calendar view
export function generateMonthGrid(year: number, month: number): CalendarDay[] {
  const grid: CalendarDay[] = [];
  const todayStr = getLocalDateString();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Total days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Day of the week of the first day (0 = Sunday, 1 = Monday...)
  const startDayOfWeek = firstDay.getDay();

  // Get days from the previous month to fill the first row
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const date = new Date(year, month - 1, d);
    const dateStr = getLocalDateString(date);
    grid.push({
      dateStr,
      isCurrentMonth: false,
      dayNumber: d,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = getLocalDateString(date);
    grid.push({
      dateStr,
      isCurrentMonth: true,
      dayNumber: d,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to round out the grid to multiples of 7 (usually 35 or 42 cells)
  const remainingCells = (7 - (grid.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const date = new Date(year, month + 1, d);
    const dateStr = getLocalDateString(date);
    grid.push({
      dateStr,
      isCurrentMonth: false,
      dayNumber: d,
      isToday: dateStr === todayStr,
    });
  }

  return grid;
}

// Generates 7 days for the weekly view centered around/starting from the week of the selected date
export function generateWeekGrid(selectedDateStr: string): CalendarDay[] {
  const grid: CalendarDay[] = [];
  const todayStr = getLocalDateString();

  const selectedDate = parseLocalDate(selectedDateStr);
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday

  // Start from Sunday of the selected date's week
  const sunday = new Date(selectedDate.getTime());
  sunday.setDate(selectedDate.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday.getTime());
    date.setDate(sunday.getDate() + i);
    const dateStr = getLocalDateString(date);
    grid.push({
      dateStr,
      isCurrentMonth: true,
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
    });
  }

  return grid;
}

// Resolves events and schedule status for all peptides on a specific day
export function getEventsForDay(
  dateStr: string,
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
): DayEvent[] {
  const todayStr = getLocalDateString();
  const events: DayEvent[] = [];

  peptides.forEach((peptide) => {
    const schedule = schedules.find((s) => s.peptideId === peptide.id);
    const log = logs.find(
      (l) => l.peptideId === peptide.id && l.scheduledDate === dateStr
    );

    const scheduled = schedule
      ? hasDoseSchedule(schedule)
        ? getDoseScheduleOccurrences(schedule, schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || dateStr, dateStr).some(
            (occurrence) => occurrence.date === dateStr
          )
        : isScheduledDate(schedule, dateStr)
      : false;

    const status = getStatusForDate(dateStr, todayStr, scheduled, log);

    if (status !== "none") {
      events.push({
        peptide,
        schedule,
        log,
        status,
      });
    }
  });

  return events;
}

export function getEventsForDateRange(
  startDateStr: string,
  endDateStr: string,
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
): Map<string, DayEvent[]> {
  const eventsByDate = new Map<string, DayEvent[]>();
  if (startDateStr > endDateStr) return eventsByDate;

  const todayStr = getLocalDateString();
  const dates = getDateRange(startDateStr, endDateStr);
  const scheduleByPeptideId = new Map<string, PeptideSchedule>();
  const logsByPeptideDate = new Map<string, InjectionLog>();

  for (const schedule of schedules) {
    if (!scheduleByPeptideId.has(schedule.peptideId)) {
      scheduleByPeptideId.set(schedule.peptideId, schedule);
    }
  }

  for (const log of logs) {
    if (log.scheduledDate < startDateStr || log.scheduledDate > endDateStr) continue;
    const key = `${log.peptideId}|${log.scheduledDate}`;
    if (!logsByPeptideDate.has(key)) {
      logsByPeptideDate.set(key, log);
    }
  }

  for (const peptide of peptides) {
    const schedule = scheduleByPeptideId.get(peptide.id);
    const scheduledDates = new Set<string>();

    if (schedule) {
      if (hasDoseSchedule(schedule)) {
        const phaseStart =
          schedule.doseScheduleStartDate ||
          schedule.startDate ||
          schedule.lastInjectionDate ||
          startDateStr;

        for (const occurrence of getDoseScheduleOccurrences(schedule, phaseStart, endDateStr)) {
          if (occurrence.date >= startDateStr) {
            scheduledDates.add(occurrence.date);
          }
        }
      } else {
        for (const dateStr of dates) {
          if (isScheduledDate(schedule, dateStr)) {
            scheduledDates.add(dateStr);
          }
        }
      }
    }

    for (const dateStr of dates) {
      const log = logsByPeptideDate.get(`${peptide.id}|${dateStr}`);
      const scheduled = scheduledDates.has(dateStr);
      const status = getStatusForDate(dateStr, todayStr, scheduled, log);
      if (status === "none") continue;

      const dayEvents = eventsByDate.get(dateStr) || [];
      dayEvents.push({
        peptide,
        schedule,
        log,
        status,
      });
      eventsByDate.set(dateStr, dayEvents);
    }
  }

  return eventsByDate;
}
