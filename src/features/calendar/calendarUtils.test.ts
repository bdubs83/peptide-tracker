import { describe, expect, it } from "vitest";
import { getEventsForDateRange } from "./calendarUtils";
import type { InjectionLog } from "../../types/injectionLog";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";

const peptide: Peptide = {
  id: "p1",
  name: "Retatrutide",
  vialMg: 10,
  bacWaterMl: 2,
  desiredDoseValue: 2,
  desiredDoseUnit: "mg",
  syringeSizeMl: 1,
  unitsPerMl: 100,
  concentrationMgPerMl: 5,
  concentrationMcgPerMl: 5000,
  doseMl: 0.4,
  doseUnits: 40,
  estimatedDosesPerVial: 5,
  percentOfVialPerDose: 20,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
};

const schedule: PeptideSchedule = {
  id: "s1",
  peptideId: "p1",
  scheduleType: "everyXDays",
  intervalDays: 1,
  startDate: "2026-06-01",
  isActive: true,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
};

describe("calendarUtils", () => {
  it("prioritizes a taken log over a scheduled placeholder for the same date", () => {
    const logs: InjectionLog[] = [
      {
        id: "placeholder",
        peptideId: "p1",
        peptideNameSnapshot: "Retatrutide",
        scheduledDate: "2026-06-16",
        doseValue: 2,
        doseUnit: "mg",
        drawMl: 0.4,
        drawUnits: 40,
        status: "scheduled",
        createdAt: "2026-06-01T12:00:00.000Z",
        updatedAt: "2026-06-01T12:00:00.000Z",
      },
      {
        id: "taken",
        peptideId: "p1",
        peptideNameSnapshot: "Retatrutide",
        scheduledDate: "2026-06-16",
        actualDateTime: "2026-06-16T13:00:00.000Z",
        doseValue: 2,
        doseUnit: "mg",
        drawMl: 0.4,
        drawUnits: 40,
        status: "taken",
        createdAt: "2026-06-16T13:00:00.000Z",
        updatedAt: "2026-06-16T13:00:00.000Z",
      },
    ];

    const events = getEventsForDateRange("2026-06-16", "2026-06-16", [peptide], [schedule], logs);
    const dayEvents = events.get("2026-06-16") || [];

    expect(dayEvents).toHaveLength(1);
    expect(dayEvents[0].status).toBe("completed");
    expect(dayEvents[0].log?.id).toBe("taken");
  });

  it("ignores stale scheduled placeholders when the current dose schedule no longer includes that date", () => {
    const sundayWednesdaySchedule: PeptideSchedule = {
      id: "s1",
      peptideId: "p1",
      scheduleType: "everyXDays",
      intervalDays: 7,
      startDate: "2026-05-31",
      doseScheduleStartDate: "2026-05-31",
      doseSchedule: [
        {
          id: "phase-1",
          durationType: "daysOfWeek",
          durationValue: 1,
          daysOfWeek: [0],
          doseValue: 0.5,
          doseUnit: "mg",
        },
        {
          id: "phase-2",
          startDate: "2026-06-03",
          durationType: "daysOfWeek",
          durationValue: 1,
          daysOfWeek: [0, 3],
          doseValue: 0.75,
          doseUnit: "mg",
        },
        {
          id: "phase-3",
          startDate: "2026-06-10",
          durationType: "daysOfWeek",
          daysOfWeek: [0, 3],
          doseValue: 1,
          doseUnit: "mg",
          isContinuous: true,
        },
      ],
      isActive: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
    };

    const logs: InjectionLog[] = [
      {
        id: "stale-placeholder",
        peptideId: "p1",
        peptideNameSnapshot: "Retatrutide",
        scheduledDate: "2026-06-27",
        doseValue: 1,
        doseUnit: "mg",
        drawMl: 0.2,
        drawUnits: 20,
        status: "scheduled",
        createdAt: "2026-06-01T12:00:00.000Z",
        updatedAt: "2026-06-01T12:00:00.000Z",
      },
    ];

    const events = getEventsForDateRange(
      "2026-06-27",
      "2026-06-27",
      [peptide],
      [sundayWednesdaySchedule],
      logs
    );

    expect(events.get("2026-06-27") || []).toHaveLength(0);
  });
});
