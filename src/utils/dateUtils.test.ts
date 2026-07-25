import { describe, it, expect } from "vitest";
import {
  getDoseScheduleOccurrences,
  getNextScheduledDoseDate,
  getNextInjectionDate,
  getUpcomingInjectionDates,
  getEstimatedEmptyDate,
  getWeekBasedDoseScheduleStockProjection,
  getEstimatedRemainingDoses,
  getSharedOpenVialProjection,
  getCurrentVialTotalMcg,
  getCurrentVialLogs,
  isCurrentVialLog,
  isDateInActiveCycle,
} from "./dateUtils";
import { convertLegacyScheduleToDoseSchedule } from "./scheduleMigration";
import type { PeptideSchedule } from "../types/schedule";
import type { Peptide } from "../types/peptide";
import type { InjectionLog } from "../types/injectionLog";
import type { VialAdjustment } from "../types/vialAdjustment";

describe("dateUtils", () => {
  it("includes a deliberately assigned backdated dose in its linked vial", () => {
    const peptide = { id: "p1", name: "Test", openVialId: "vial-1", currentVialStartedAt: "2026-07-08T12:00:00.000Z" } as Peptide;
    const log = { id: "log-1", peptideId: "p1", openVialId: "vial-1", inventoryAssignment: "assigned", actualDateTime: "2026-07-04T12:00:00.000Z" } as InjectionLog;
    expect(isCurrentVialLog(peptide, log)).toBe(true);
  });

  it("excludes a dose left unassigned for later reconciliation", () => {
    const peptide = { id: "p1", name: "Test", openVialId: "vial-1" } as Peptide;
    const log = { id: "log-1", peptideId: "p1", inventoryAssignment: "unassigned" } as InjectionLog;
    expect(isCurrentVialLog(peptide, log)).toBe(false);
  });

  describe("getNextInjectionDate - everyXDays", () => {
    it("should calculate correct next date with startDate anchor", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      // Starting from 2026-06-10:
      // Candidates: 10, 13, 16, 19, 22...
      expect(getNextInjectionDate(schedule, "2026-06-09")).toBe("2026-06-10");
      expect(getNextInjectionDate(schedule, "2026-06-10")).toBe("2026-06-10");
      expect(getNextInjectionDate(schedule, "2026-06-11")).toBe("2026-06-13");
      expect(getNextInjectionDate(schedule, "2026-06-13")).toBe("2026-06-13");
      expect(getNextInjectionDate(schedule, "2026-06-14")).toBe("2026-06-16");
    });

    it("should calculate correct next date with lastInjectionDate anchor", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 5,
        lastInjectionDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      // Starting from lastInjectionDate 2026-06-10, interval 5:
      // Candidates: 2026-06-15, 2026-06-20, 2026-06-25...
      expect(getNextInjectionDate(schedule, "2026-06-10")).toBe("2026-06-15");
      expect(getNextInjectionDate(schedule, "2026-06-11")).toBe("2026-06-15");
      expect(getNextInjectionDate(schedule, "2026-06-15")).toBe("2026-06-15");
      expect(getNextInjectionDate(schedule, "2026-06-16")).toBe("2026-06-20");
    });

    it("should skip today if today is already logged", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const loggedDates = new Set(["2026-06-10"]);
      expect(getNextInjectionDate(schedule, "2026-06-10", loggedDates)).toBe("2026-06-13");
    });

    it("fast-forwards from an old start date without changing every-X-days results", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2020-01-01",
        isActive: true,
        createdAt: "2020-01-01T12:00:00Z",
        updatedAt: "2020-01-01T12:00:00Z",
      };

      expect(getNextInjectionDate(schedule, "2026-06-29")).toBe("2026-07-01");
    });

    it("fast-forwards from an old last injection anchor while respecting the next-dose offset", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 5,
        lastInjectionDate: "2020-01-01",
        isActive: true,
        createdAt: "2020-01-01T12:00:00Z",
        updatedAt: "2020-01-01T12:00:00Z",
      };

      expect(getNextInjectionDate(schedule, "2026-06-29")).toBe("2026-07-03");
    });
  });

  describe("getNextInjectionDate - daysOfWeek", () => {
    it("should return the next selected weekday", () => {
      const schedule: PeptideSchedule = {
        id: "s2",
        peptideId: "p2",
        scheduleType: "daysOfWeek",
        daysOfWeek: [1, 4], // Monday (1), Thursday (4)
        startDate: "2026-06-10", // Wednesday
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      // 2026-06-10 is Wed. Next Mon/Thu:
      // Jun 10 (Wed) -> next is Jun 11 (Thu)
      // Jun 11 (Thu) -> next is Jun 11 (Thu)
      // Jun 12 (Fri) -> next is Jun 15 (Mon)
      expect(getNextInjectionDate(schedule, "2026-06-10")).toBe("2026-06-11");
      expect(getNextInjectionDate(schedule, "2026-06-11")).toBe("2026-06-11");
      expect(getNextInjectionDate(schedule, "2026-06-12")).toBe("2026-06-15");
    });

    it("should respect the startDate constraint for daysOfWeek", () => {
      const schedule: PeptideSchedule = {
        id: "s2",
        peptideId: "p2",
        scheduleType: "daysOfWeek",
        daysOfWeek: [1], // Monday
        startDate: "2026-06-15", // Monday
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      // check from June 10, next Monday should be June 15 (since startDate is June 15)
      expect(getNextInjectionDate(schedule, "2026-06-10")).toBe("2026-06-15");
    });
  });

  describe("getUpcomingInjectionDates", () => {
    it("should list all scheduled dates in range", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 2,
        startDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const dates = getUpcomingInjectionDates(schedule, "2026-06-10", "2026-06-16");
      expect(dates).toEqual(["2026-06-10", "2026-06-12", "2026-06-14", "2026-06-16"]);
    });

    it("uses the dosing schedule as the source of truth when one exists", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-22",
        doseScheduleStartDate: "2026-05-31",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "weeks",
            durationValue: 4,
            doseValue: 4,
            doseUnit: "mg",
          },
          {
            id: "phase-2",
            durationType: "weeks",
            durationValue: 4,
            doseValue: 4,
            doseUnit: "mg",
          },
          {
            id: "phase-3",
            durationType: "weeks",
            doseValue: 6,
            doseUnit: "mg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-22T12:00:00Z",
        updatedAt: "2026-06-22T12:00:00Z",
      };

      const dates = getUpcomingInjectionDates(schedule, "2026-05-31", "2026-06-22");

      expect(dates).toEqual(["2026-05-31", "2026-06-07", "2026-06-14", "2026-06-21"]);
    });

    it("skips off-cycle dates for repeating on/off schedules", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-06-01",
        cycleEnabled: true,
        cycleWeeksOn: 4,
        cycleWeeksOff: 2,
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      const dates = getUpcomingInjectionDates(schedule, "2026-06-01", "2026-07-20");

      expect(dates).toEqual([
        "2026-06-01",
        "2026-06-08",
        "2026-06-15",
        "2026-06-22",
        "2026-07-13",
        "2026-07-20",
      ]);
    });
  });

  describe("isDateInActiveCycle", () => {
    it("treats the on window as active and the off window as inactive", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        doseScheduleStartDate: "2026-06-01",
        cycleEnabled: true,
        cycleWeeksOn: 8,
        cycleWeeksOff: 4,
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      expect(isDateInActiveCycle(schedule, "2026-07-20")).toBe(true);
      expect(isDateInActiveCycle(schedule, "2026-07-27")).toBe(false);
      expect(isDateInActiveCycle(schedule, "2026-08-24")).toBe(true);
    });
  });

  describe("getDoseScheduleOccurrences", () => {
    it("supports a continuous every-1-day dosing phase without relying on legacy schedule timing", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-06-01",
        doseScheduleStartDate: "2026-06-01",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "injections",
            intervalDays: 1,
            doseValue: 500,
            doseUnit: "mcg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-06-01", "2026-06-04").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual(["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"]);
    });

    it("stops a final dosing phase after its inclusive end date", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        doseScheduleStartDate: "2026-06-01",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "injections",
            intervalDays: 2,
            endDate: "2026-06-05",
            doseValue: 500,
            doseUnit: "mcg",
            isContinuous: false,
          },
        ],
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-06-01", "2026-06-10").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual(["2026-06-01", "2026-06-03", "2026-06-05"]);
    });

    it("uses dosing schedule weekday dates instead of the main injection interval", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-10",
        doseScheduleStartDate: "2026-05-24",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "daysOfWeek",
            durationValue: 4,
            daysOfWeek: [0],
            doseValue: 250,
            doseUnit: "mcg",
          },
          {
            id: "phase-2",
            durationType: "weeks",
            doseValue: 500,
            doseUnit: "mcg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-05-24", "2026-06-14").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual(["2026-05-24", "2026-05-31", "2026-06-07", "2026-06-14"]);
    });

    it("uses weekly dates for week-based dosing phases instead of the main injection interval", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-10",
        doseScheduleStartDate: "2026-05-24",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "weeks",
            durationValue: 2,
            doseValue: 250,
            doseUnit: "mcg",
          },
          {
            id: "phase-2",
            durationType: "weeks",
            doseValue: 500,
            doseUnit: "mcg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-05-24", "2026-06-02").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual(["2026-05-24", "2026-05-31"]);
    });

    it("keeps multi-phase week-based dosing schedules weekly across past dates", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-22",
        doseScheduleStartDate: "2026-05-31",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "weeks",
            durationValue: 4,
            doseValue: 4,
            doseUnit: "mg",
          },
          {
            id: "phase-2",
            durationType: "weeks",
            durationValue: 4,
            doseValue: 4,
            doseUnit: "mg",
          },
          {
            id: "phase-3",
            durationType: "weeks",
            doseValue: 6,
            doseUnit: "mg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-22T12:00:00Z",
        updatedAt: "2026-06-22T12:00:00Z",
      };

      const occurrences = getDoseScheduleOccurrences(schedule, "2026-05-31", "2026-06-22");

      expect(occurrences.map((occurrence) => occurrence.date)).toEqual([
        "2026-05-31",
        "2026-06-07",
        "2026-06-14",
        "2026-06-21",
      ]);
      expect(occurrences.map((occurrence) => occurrence.phase.doseValue)).toEqual([4, 4, 4, 4]);
    });

    it("stops a final finite weekly dosing phase at its duration", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-01",
        doseScheduleStartDate: "2026-06-01",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "weeks",
            durationValue: 2,
            doseValue: 500,
            doseUnit: "mcg",
          },
        ],
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-06-01", "2026-07-01").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual(["2026-06-01", "2026-06-08"]);
    });

    it("stops a final finite injection-count dosing phase at its duration", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 2,
        startDate: "2026-06-01",
        doseScheduleStartDate: "2026-06-01",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "injections",
            durationValue: 3,
            doseValue: 500,
            doseUnit: "mcg",
          },
        ],
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-06-01", "2026-07-01").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual(["2026-06-01", "2026-06-03", "2026-06-05"]);
    });

    it("allows a later dosing phase start date to end the prior titration phase", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-05-31",
        doseScheduleStartDate: "2026-05-31",
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "injections",
            intervalDays: 7,
            doseValue: 2,
            doseUnit: "mg",
          },
          {
            id: "phase-2",
            startDate: "2026-06-03",
            durationType: "daysOfWeek",
            daysOfWeek: [2, 5],
            doseValue: 4,
            doseUnit: "mg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-05-31T12:00:00Z",
        updatedAt: "2026-05-31T12:00:00Z",
      };

      const occurrences = getDoseScheduleOccurrences(schedule, "2026-05-31", "2026-06-12");

      expect(occurrences.map((occurrence) => occurrence.date)).toEqual([
        "2026-05-31",
        "2026-06-05",
        "2026-06-09",
        "2026-06-12",
      ]);
      expect(occurrences.map((occurrence) => occurrence.phase.doseValue)).toEqual([2, 4, 4, 4]);
    });

    it("filters dose schedule occurrences through cycle off weeks", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-06-01",
        doseScheduleStartDate: "2026-06-01",
        cycleEnabled: true,
        cycleWeeksOn: 4,
        cycleWeeksOff: 2,
        doseSchedule: [
          {
            id: "phase-1",
            durationType: "injections",
            intervalDays: 7,
            doseValue: 1,
            doseUnit: "mg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };

      const dates = getDoseScheduleOccurrences(schedule, "2026-06-01", "2026-07-20").map(
        (occurrence) => occurrence.date
      );

      expect(dates).toEqual([
        "2026-06-01",
        "2026-06-08",
        "2026-06-15",
        "2026-06-22",
        "2026-07-13",
        "2026-07-20",
      ]);
    });
  });

  describe("convertLegacyScheduleToDoseSchedule", () => {
    it("converts an every-X-days injection schedule into one continuous dosing phase", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const converted = convertLegacyScheduleToDoseSchedule(schedule, {
        desiredDoseValue: 0.25,
        desiredDoseUnit: "mg",
      });

      expect(converted.doseScheduleStartDate).toBe("2026-06-10");
      expect(converted.doseSchedule).toEqual([
        expect.objectContaining({
          durationType: "injections",
          intervalDays: 3,
          doseValue: 0.25,
          doseUnit: "mg",
          isContinuous: true,
        }),
      ]);
    });

    it("moves a last-injection anchor to the next due date during conversion", () => {
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 5,
        lastInjectionDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const converted = convertLegacyScheduleToDoseSchedule(schedule, {
        desiredDoseValue: 250,
        desiredDoseUnit: "mcg",
      });

      expect(converted.doseScheduleStartDate).toBe("2026-06-15");
    });
  });

  describe("getEstimatedEmptyDate", () => {
    it("should estimate empty date based on logs and remaining vial amount", () => {
      const peptide: Peptide = {
        id: "p1",
        name: "Test Peptide",
        vialMg: 5, // 5000 mcg
        bacWaterMl: 2,
        desiredDoseValue: 1000, // 1000 mcg per injection
        desiredDoseUnit: "mcg",
        syringeSizeMl: 1,
        unitsPerMl: 100,
        concentrationMgPerMl: 2.5,
        concentrationMcgPerMl: 2500,
        doseMl: 0.4,
        doseUnits: 40,
        estimatedDosesPerVial: 5,
        percentOfVialPerDose: 20,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 2,
        startDate: "2026-06-10",
        isActive: true,
        createdAt: "2026-06-10T12:00:00Z",
        updatedAt: "2026-06-10T12:00:00Z",
      };

      // 5 doses total.
      // Suppose we have logged 2 doses as 'taken'
      const logs: InjectionLog[] = [
        {
          id: "l1",
          peptideId: "p1",
          peptideNameSnapshot: "Test Peptide",
          scheduledDate: "2026-06-10",
          doseValue: 1000,
          doseUnit: "mcg",
          drawMl: 0.4,
          drawUnits: 40,
          status: "taken",
          createdAt: "2026-06-10T12:00:00Z",
          updatedAt: "2026-06-10T12:00:00Z",
        },
        {
          id: "l2",
          peptideId: "p1",
          peptideNameSnapshot: "Test Peptide",
          scheduledDate: "2026-06-12",
          doseValue: 1000,
          doseUnit: "mcg",
          drawMl: 0.4,
          drawUnits: 40,
          status: "taken",
          createdAt: "2026-06-12T12:00:00Z",
          updatedAt: "2026-06-12T12:00:00Z",
        },
      ];

      // Taken: 2000 mcg. Remaining: 3000 mcg.
      // Doses left: 3 doses.
      // From 2026-06-13:
      // Next 3 schedules starting from 2026-06-13:
      // candidates are multiples of 2 starting from June 10: 10(taken), 12(taken), 14, 16, 18.
      // 1st remaining dose: June 14
      // 2nd remaining dose: June 16
      // 3rd remaining dose: June 18
      // Expected empty date: June 18
      const emptyDate = getEstimatedEmptyDate(peptide, schedule, logs, "2026-06-13");
      expect(emptyDate).toBe("2026-06-18");
    });

    it("ignores prior vial logs after a stock refill starts a new current vial", () => {
      const peptide: Peptide = {
        id: "p1",
        name: "Test Peptide",
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
        currentVialStartedAt: "2026-06-20T12:00:00.000Z",
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-20T12:00:00Z",
      };
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-06-20",
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-20T12:00:00Z",
      };
      const logs: InjectionLog[] = [
        {
          id: "old-log",
          peptideId: "p1",
          peptideNameSnapshot: "Test Peptide",
          scheduledDate: "2026-06-13",
          actualDateTime: "2026-06-13T12:00:00.000Z",
          doseValue: 10,
          doseUnit: "mg",
          drawMl: 2,
          drawUnits: 200,
          status: "taken",
          createdAt: "2026-06-13T12:00:00.000Z",
          updatedAt: "2026-06-13T12:00:00.000Z",
        },
      ];

      expect(getEstimatedRemainingDoses(peptide, schedule, logs, "2026-06-20")).toBe(5);
      expect(getEstimatedEmptyDate(peptide, schedule, logs, "2026-06-20")).toBe("2026-07-18");
    });

    it("uses actual injection time before row creation time for current vial tracking", () => {
      const peptide: Peptide = {
        id: "p1",
        name: "Test Peptide",
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
        currentVialStartedAt: "2026-06-25T08:00:00.000Z",
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-25T08:00:00Z",
      };
      const convertedPlaceholderLog: InjectionLog = {
        id: "converted-placeholder",
        peptideId: "p1",
        peptideNameSnapshot: "Test Peptide",
        scheduledDate: "2026-06-26",
        actualDateTime: "2026-06-26T08:00:00.000Z",
        doseValue: 2,
        doseUnit: "mg",
        drawMl: 0.4,
        drawUnits: 40,
        status: "taken",
        createdAt: "2026-06-20T08:00:00.000Z",
        updatedAt: "2026-06-26T08:00:00.000Z",
      };

      expect(isCurrentVialLog(peptide, convertedPlaceholderLog)).toBe(true);
    });

    it("tracks carried-over vial amount after an early stock refill", () => {
      const peptide: Peptide = {
        id: "p1",
        name: "Test Peptide",
        vialMg: 5,
        currentVialTotalMg: 7,
        bacWaterMl: 2,
        desiredDoseValue: 4,
        desiredDoseUnit: "mg",
        syringeSizeMl: 1,
        unitsPerMl: 100,
        concentrationMgPerMl: 2.5,
        concentrationMcgPerMl: 2500,
        doseMl: 1.6,
        doseUnits: 160,
        estimatedDosesPerVial: 1,
        percentOfVialPerDose: 80,
        currentVialStartedAt: "2026-06-29T12:00:00.000Z",
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-29T12:00:00Z",
      };
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-06-29",
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-29T12:00:00Z",
      };

      expect(getCurrentVialTotalMcg(peptide)).toBe(7000);
      expect(getEstimatedRemainingDoses(peptide, schedule, [], "2026-06-29")).toBe(1);
      expect(getEstimatedEmptyDate(peptide, schedule, [], "2026-06-29")).toBe("2026-07-06");
    });

    it("subtracts vial adjustments from remaining current-vial projections", () => {
      const peptide: Peptide = {
        id: "p1",
        name: "Test Peptide",
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
        openVialId: "vial-1",
        currentVialStartedAt: "2026-06-29T12:00:00.000Z",
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-29T12:00:00Z",
      };
      const schedule: PeptideSchedule = {
        id: "s1",
        peptideId: "p1",
        openVialId: "vial-1",
        scheduleType: "everyXDays",
        intervalDays: 7,
        startDate: "2026-06-29",
        isActive: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-29T12:00:00Z",
      };
      const adjustments: VialAdjustment[] = [
        {
          id: "adj-1",
          peptideId: "p1",
          openVialId: "vial-1",
          peptideNameSnapshot: "Test Peptide",
          adjustmentDate: "2026-06-29",
          amountValue: 4,
          amountUnit: "mg",
          amountMcg: 4000,
          reason: "familyFriend",
          createdAt: "2026-06-29T13:00:00.000Z",
          updatedAt: "2026-06-29T13:00:00.000Z",
        },
      ];

      expect(getEstimatedRemainingDoses(peptide, schedule, [], "2026-06-29", adjustments)).toBe(3);
      expect(getEstimatedEmptyDate(peptide, schedule, [], "2026-06-29", adjustments)).toBe("2026-07-13");
    });
  });

  describe("getSharedOpenVialProjection", () => {
    it("combines future doses from multiple schedules sharing one open vial", () => {
      const sharedVialPeptide: Peptide = {
        id: "p1",
        name: "Shared Test",
        vialMg: 10,
        bacWaterMl: 2,
        desiredDoseValue: 1,
        desiredDoseUnit: "mg",
        syringeSizeMl: 1,
        unitsPerMl: 100,
        concentrationMgPerMl: 5,
        concentrationMcgPerMl: 5000,
        doseMl: 0.2,
        doseUnits: 20,
        estimatedDosesPerVial: 10,
        percentOfVialPerDose: 10,
        vaultUserId: "user-1",
        openVialId: "vial-1",
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z",
      };
      const secondUserPeptide: Peptide = {
        ...sharedVialPeptide,
        id: "p2",
        vaultUserId: "user-2",
      };
      const schedules: PeptideSchedule[] = [
        {
          id: "s1",
          peptideId: "p1",
          vaultUserId: "user-1",
          openVialId: "vial-1",
          scheduleType: "everyXDays",
          intervalDays: 7,
          startDate: "2026-06-01",
          doseScheduleStartDate: "2026-06-01",
          doseSchedule: [
            {
              id: "phase-1",
              durationType: "injections",
              intervalDays: 7,
              doseValue: 1,
              doseUnit: "mg",
              isContinuous: true,
            },
          ],
          isActive: true,
          createdAt: "2026-06-01T12:00:00Z",
          updatedAt: "2026-06-01T12:00:00Z",
        },
        {
          id: "s2",
          peptideId: "p2",
          vaultUserId: "user-2",
          openVialId: "vial-1",
          scheduleType: "everyXDays",
          intervalDays: 7,
          startDate: "2026-06-01",
          doseScheduleStartDate: "2026-06-01",
          doseSchedule: [
            {
              id: "phase-2",
              durationType: "injections",
              intervalDays: 7,
              doseValue: 1,
              doseUnit: "mg",
              isContinuous: true,
            },
          ],
          isActive: true,
          createdAt: "2026-06-01T12:00:00Z",
          updatedAt: "2026-06-01T12:00:00Z",
        },
      ];

      const projection = getSharedOpenVialProjection(
        sharedVialPeptide,
        [sharedVialPeptide, secondUserPeptide],
        schedules,
        [],
        "2026-06-01"
      );

      expect(projection.injectionCount).toBe(10);
      expect(projection.emptyDate).toBe("2026-06-29");
    });
  });

  describe("getWeekBasedDoseScheduleStockProjection", () => {
    it("treats a continuous week-based dose schedule as weekly stock consumption", () => {
      const schedule: PeptideSchedule = {
        id: "s-retatrutide",
        peptideId: "retatrutide",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-22",
        doseScheduleStartDate: "2026-06-22",
        doseSchedule: [
          {
            id: "continuous-7mg",
            durationType: "weeks",
            doseValue: 7,
            doseUnit: "mg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-22T12:00:00Z",
        updatedAt: "2026-06-22T12:00:00Z",
      };

      const projection = getWeekBasedDoseScheduleStockProjection(
        schedule,
        600 * 1000,
        "2026-06-22"
      );

      expect(projection?.daysUntilEmpty).toBe(600);
      expect(projection?.emptyDate).toBe("2028-02-12");
      expect(projection?.injectionCount).toBe(85);
    });
  });

  describe("getNextScheduledDoseDate", () => {
    it("advances a weekly dose schedule after that scheduled date is logged", () => {
      const schedule: PeptideSchedule = {
        id: "retatrutide-schedule",
        peptideId: "retatrutide",
        scheduleType: "everyXDays",
        intervalDays: 3,
        startDate: "2026-06-16",
        doseScheduleStartDate: "2026-05-31",
        doseSchedule: [
          {
            id: "four-mg-start",
            durationType: "weeks",
            durationValue: 4,
            doseValue: 4,
            doseUnit: "mg",
          },
          {
            id: "four-mg-bridge",
            durationType: "weeks",
            doseValue: 4,
            doseUnit: "mg",
          },
          {
            id: "five-mg-continuous",
            startDate: "2026-07-05",
            durationType: "weeks",
            doseValue: 5,
            doseUnit: "mg",
            isContinuous: true,
          },
        ],
        isActive: true,
        createdAt: "2026-06-16T22:36:04.468Z",
        updatedAt: "2026-07-04T23:23:08.295Z",
      };

      expect(getNextScheduledDoseDate(schedule, "2026-07-12", new Set(["2026-07-12"]))).toBe(
        "2026-07-19"
      );
    });

    it("keeps a completed schedule date after a vial is changed later that day", () => {
      const peptide: Peptide = {
        id: "retatrutide",
        name: "Retatrutide",
        vialMg: 60,
        bacWaterMl: 3,
        desiredDoseValue: 5,
        desiredDoseUnit: "mg",
        syringeSizeMl: 1,
        unitsPerMl: 100,
        concentrationMgPerMl: 20,
        concentrationMcgPerMl: 20000,
        doseMl: 0.25,
        doseUnits: 25,
        estimatedDosesPerVial: 12,
        percentOfVialPerDose: 8.33,
        openVialId: "new-vial",
        currentVialStartedAt: "2026-07-12T22:38:00.000Z",
        currentVialTotalMg: 62,
        createdAt: "2026-06-16T22:36:04.468Z",
        updatedAt: "2026-07-12T22:38:00.000Z",
      };
      const schedule: PeptideSchedule = {
        id: "retatrutide-schedule",
        peptideId: peptide.id,
        scheduleType: "everyXDays",
        intervalDays: 7,
        doseScheduleStartDate: "2026-07-05",
        doseSchedule: [{ id: "five-mg", durationType: "weeks", doseValue: 5, doseUnit: "mg", isContinuous: true }],
        isActive: true,
        createdAt: peptide.createdAt,
        updatedAt: peptide.updatedAt,
      };
      const completedBeforeVialChange: InjectionLog = {
        id: "july-12-dose",
        peptideId: peptide.id,
        openVialId: "old-vial",
        peptideNameSnapshot: peptide.name,
        scheduledDate: "2026-07-12",
        actualDateTime: "2026-07-12T19:03:00.000Z",
        doseValue: 5,
        doseUnit: "mg",
        drawMl: 0.25,
        drawUnits: 25,
        status: "taken",
        createdAt: "2026-07-12T19:03:00.000Z",
        updatedAt: "2026-07-12T19:03:00.000Z",
      };

      // The old log must not reduce the new vial's balance.
      expect(getCurrentVialLogs(peptide, [completedBeforeVialChange])).toEqual([]);
      // It must still fulfill the person's July 12 scheduled dose.
      expect(getNextScheduledDoseDate(schedule, "2026-07-12", new Set([completedBeforeVialChange.scheduledDate]))).toBe(
        "2026-07-19"
      );
    });
  });
});
