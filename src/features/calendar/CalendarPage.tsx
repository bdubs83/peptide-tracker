import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { db } from "../../db/db";
import { activeRecords } from "../../db/activeRecords";
import { putAppSetting } from "../../db/appSettings";
import { ensureDefaultVaultUser } from "../../db/vaultUsers";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CalendarGrid } from "../../components/CalendarGrid";
import { firebaseAuth } from "../../firebase/firebase";
import {
  generateMonthGrid,
  generateWeekGrid,
  getEventsForDay,
  getEventsForDateRange,
} from "./calendarUtils";
import type { CalendarDay, DayEvent } from "./calendarUtils";
import {
  getLocalDateString,
  parseLocalDate,
  addDays,
  getScheduledDoseForDate,
  getUpcomingInjectionDates,
} from "../../utils/dateUtils";
import {
  formatMl,
  formatUnits,
  formatDose,
} from "../../utils/formatting";
import { normalizeDoseToMcg } from "../calculator/calculatorUtils";
import { logInjectionEvent, deleteInjectionLog } from "../vault/vaultUtils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  CalendarPlus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type { InjectionLog } from "../../types/injectionLog";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import { DEFAULT_VAULT_USER_ID } from "../../types/vaultUser";
import { SyringeVisualizer } from "../../components/SyringeVisualizer";
import { makePreferredScheduleMap } from "../../utils/scheduleUtils";

type CalendarEventFilter = "all" | "due" | "missed" | "upcoming" | "logged";
const googleSyncedEventIdsKey = "googleCalendar_syncedEventIds";
const calendarRepairWindowDays = 365;
const pastTakenRepairNote = "Marked taken by past dosing schedule repair.";
const pastTakenRepairCreatedNote = "Marked taken by past dosing schedule repair (created).";
const pastTakenRepairConvertedNote = "Marked taken by past dosing schedule repair (converted).";
const autoLoggedScheduleNote = "Auto-logged from verified past dosing schedule.";
const pastTakenRepairNotes = new Set([
  pastTakenRepairNote,
  pastTakenRepairCreatedNote,
  pastTakenRepairConvertedNote,
]);

const filterOptions: Array<{ value: CalendarEventFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "due", label: "Due" },
  { value: "missed", label: "Missed" },
  { value: "upcoming", label: "Upcoming" },
  { value: "logged", label: "Logged" },
];

const getDrawForDose = (
  doseValue: number,
  doseUnit: "mcg" | "mg",
  concentrationMcgPerMl: number,
  unitsPerMl: number
) => {
  const doseMcg = normalizeDoseToMcg(doseValue, doseUnit);
  const drawMl = concentrationMcgPerMl > 0 ? doseMcg / concentrationMcgPerMl : 0;
  return {
    drawMl,
    drawUnits: drawMl * unitsPerMl,
  };
};

type GoogleCalendarExportEvent = {
  id: string;
  date: string;
  time: string;
  peptideName: string;
  doseLabel: string;
  drawLabel: string;
  status: DayEvent["status"];
};

const buildLocalDate = (dateStr: string, time = "09:00", minutesToAdd = 0) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours || 0, minutes || 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date;
};

const toGoogleDateTime = (date: Date) => {
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
  return `${datePart}T${timePart}`;
};

const statusLabel = (status: DayEvent["status"]) => {
  if (status === "completed") return "logged";
  return status;
};

const buildGoogleCalendarPayload = (event: GoogleCalendarExportEvent) => {
  const start = buildLocalDate(event.date, event.time, 0);
  const end = buildLocalDate(event.date, event.time, 30);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return {
    summary: `${event.peptideName} injection`,
    description: [
      `Time: ${event.time || "09:00"}`,
      `Dose: ${event.doseLabel}`,
      `Draw: ${event.drawLabel}`,
      `Status in app: ${statusLabel(event.status)}`,
      "Created from Inner Circle.",
    ].join("\n"),
    start: {
      dateTime: toGoogleDateTime(start),
      timeZone,
    },
    end: {
      dateTime: toGoogleDateTime(end),
      timeZone,
    },
    extendedProperties: {
      private: {
        innerCircleEventId: event.id,
      },
    },
  };
};

const buildGoogleCalendarExportEvents = (
  startDate: string,
  endDate: string,
  peptideIds: string[],
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
) => {
  if (!startDate || !endDate || startDate > endDate) return [];

  const selectedIds = new Set(peptideIds);
  const exportEvents: GoogleCalendarExportEvent[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    const events = getEventsForDay(cursor, peptides, schedules, logs).filter(
      (event) => selectedIds.has(event.peptide.id) && event.status !== "skipped"
    );

    for (const event of events) {
      const scheduledDose = event.schedule
        ? getScheduledDoseForDate(event.peptide, event.schedule, cursor)
        : {
            doseValue: event.peptide.desiredDoseValue,
            doseUnit: event.peptide.desiredDoseUnit,
          };
      const scheduledDraw = getDrawForDose(
        scheduledDose.doseValue,
        scheduledDose.doseUnit,
        event.peptide.concentrationMcgPerMl,
        event.peptide.unitsPerMl
      );
      const baseEvent = {
        date: cursor,
        time: event.schedule?.injectionTime || "09:00",
        peptideName: event.peptide.name,
        doseLabel: formatDose(scheduledDose.doseValue, scheduledDose.doseUnit),
        drawLabel: `${formatMl(scheduledDraw.drawMl)} / ${formatUnits(scheduledDraw.drawUnits)}`,
        status: event.status,
      };
      exportEvents.push({
        ...baseEvent,
        id: `${event.peptide.id}-${cursor}-${baseEvent.time}`,
      });
    }

    cursor = addDays(cursor, 1);
    if (exportEvents.length > 500 || cursor > addDays(endDate, 1)) break;
  }

  return exportEvents;
};

const buildUpcomingCalendarRepairLogs = (
  startDate: string,
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
) => {
  const endDate = addDays(startDate, calendarRepairWindowDays);
  const peptideById = new Map(peptides.map((peptide) => [peptide.id, peptide]));
  const existingDateKeys = new Set(logs.map((log) => `${log.peptideId}|${log.scheduledDate}`));
  const nowIso = new Date().toISOString();
  const repairLogs: InjectionLog[] = [];

  for (const schedule of schedules) {
    if (!schedule.isActive) continue;

    const peptide = peptideById.get(schedule.peptideId);
    if (!peptide) continue;

    const scheduledDates = getUpcomingInjectionDates(schedule, startDate, endDate);
    for (const scheduledDate of scheduledDates) {
      const key = `${schedule.peptideId}|${scheduledDate}`;
      if (existingDateKeys.has(key)) continue;

      const scheduledDose = getScheduledDoseForDate(peptide, schedule, scheduledDate);
      const scheduledDraw = getDrawForDose(
        scheduledDose.doseValue,
        scheduledDose.doseUnit,
        peptide.concentrationMcgPerMl,
        peptide.unitsPerMl
      );

      repairLogs.push({
        id: crypto.randomUUID(),
        peptideId: peptide.id,
        vaultUserId: peptide.vaultUserId,
        openVialId: peptide.openVialId || peptide.id,
        peptideNameSnapshot: peptide.name,
        scheduledDate,
        doseValue: scheduledDose.doseValue,
        doseUnit: scheduledDose.doseUnit,
        drawMl: scheduledDraw.drawMl,
        drawUnits: scheduledDraw.drawUnits,
        status: "scheduled",
        notes: "Restored by upcoming calendar repair.",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      existingDateKeys.add(key);
    }
  }

  return repairLogs;
};

type PastCalendarRepairResult = {
  createdLogs: InjectionLog[];
  updatedLogs: Array<{
    id: string;
    actualDateTime: string;
    doseValue: number;
    doseUnit: InjectionLog["doseUnit"];
    drawMl: number;
    drawUnits: number;
  }>;
};

const getScheduleFirstDoseDate = (schedule: PeptideSchedule) => {
  if (schedule.doseScheduleStartDate) return schedule.doseScheduleStartDate;
  if (schedule.startDate) return schedule.startDate;
  if (schedule.lastInjectionDate) return addDays(schedule.lastInjectionDate, Math.max(1, schedule.intervalDays || 1));
  return "";
};

const buildPastTakenCalendarRepair = (
  endDate: string,
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
): PastCalendarRepairResult => {
  const peptideById = new Map(peptides.map((peptide) => [peptide.id, peptide]));
  const logsByPeptideDate = new Map<string, InjectionLog[]>();
  const nowIso = new Date().toISOString();
  const result: PastCalendarRepairResult = {
    createdLogs: [],
    updatedLogs: [],
  };

  for (const log of logs) {
    const key = `${log.peptideId}|${log.scheduledDate}`;
    const dayLogs = logsByPeptideDate.get(key) || [];
    dayLogs.push(log);
    logsByPeptideDate.set(key, dayLogs);
  }

  for (const schedule of schedules) {
    if (!schedule.isActive) continue;

    const peptide = peptideById.get(schedule.peptideId);
    if (!peptide) continue;

    const startDate = getScheduleFirstDoseDate(schedule);
    if (!startDate || startDate > endDate) continue;

    const scheduledDates = getUpcomingInjectionDates(schedule, startDate, endDate);
    for (const scheduledDate of scheduledDates) {
      const key = `${schedule.peptideId}|${scheduledDate}`;
      const dayLogs = logsByPeptideDate.get(key) || [];
      const hasFinalLog = dayLogs.some((log) => log.status !== "scheduled");
      if (hasFinalLog) continue;

      const scheduledDose = getScheduledDoseForDate(peptide, schedule, scheduledDate);
      const scheduledDraw = getDrawForDose(
        scheduledDose.doseValue,
        scheduledDose.doseUnit,
        peptide.concentrationMcgPerMl,
        peptide.unitsPerMl
      );
      const scheduledPlaceholder = dayLogs.find((log) => log.status === "scheduled");
      const actualDateTime = new Date(`${scheduledDate}T${schedule.injectionTime || "12:00"}`).toISOString();

      if (scheduledPlaceholder) {
        result.updatedLogs.push({
          id: scheduledPlaceholder.id,
          actualDateTime,
          doseValue: scheduledDose.doseValue,
          doseUnit: scheduledDose.doseUnit,
          drawMl: scheduledDraw.drawMl,
          drawUnits: scheduledDraw.drawUnits,
        });
      } else {
        result.createdLogs.push({
          id: crypto.randomUUID(),
          peptideId: peptide.id,
          vaultUserId: schedule.vaultUserId || peptide.vaultUserId,
          openVialId: schedule.openVialId || peptide.openVialId || peptide.id,
          peptideNameSnapshot: peptide.name,
          scheduledDate,
          actualDateTime,
          doseValue: scheduledDose.doseValue,
          doseUnit: scheduledDose.doseUnit,
          drawMl: scheduledDraw.drawMl,
          drawUnits: scheduledDraw.drawUnits,
          status: "taken",
          notes: pastTakenRepairCreatedNote,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  }

  return result;
};

type HistoryDoseRepair = Array<{
  id: string;
  doseValue: number;
  doseUnit: InjectionLog["doseUnit"];
  drawMl: number;
  drawUnits: number;
}>;

const buildHistoryDoseRepair = (
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
): HistoryDoseRepair => {
  const peptideById = new Map(peptides.map((peptide) => [peptide.id, peptide]));
  const scheduleByPeptideId = makePreferredScheduleMap(schedules);
  const repairableNotes = new Set([...pastTakenRepairNotes, autoLoggedScheduleNote]);

  return logs.flatMap((log) => {
    if (!repairableNotes.has(log.notes || "")) return [];
    if (log.status !== "taken" && log.status !== "manual") return [];

    const peptide = peptideById.get(log.peptideId);
    const schedule = scheduleByPeptideId.get(log.peptideId);
    if (!peptide || !schedule?.isActive) return [];

    const occurrence = getUpcomingInjectionDates(schedule, log.scheduledDate, log.scheduledDate)[0];
    if (occurrence !== log.scheduledDate) return [];

    const scheduledDose = getScheduledDoseForDate(peptide, schedule, log.scheduledDate);
    const scheduledDraw = getDrawForDose(
      scheduledDose.doseValue,
      scheduledDose.doseUnit,
      peptide.concentrationMcgPerMl,
      peptide.unitsPerMl
    );
    const isSameDose =
      log.doseValue === scheduledDose.doseValue &&
      log.doseUnit === scheduledDose.doseUnit &&
      Math.abs(log.drawMl - scheduledDraw.drawMl) < 0.0001 &&
      Math.abs(log.drawUnits - scheduledDraw.drawUnits) < 0.0001;

    if (isSameDose) return [];

    return [
      {
        id: log.id,
        doseValue: scheduledDose.doseValue,
        doseUnit: scheduledDose.doseUnit,
        drawMl: scheduledDraw.drawMl,
        drawUnits: scheduledDraw.drawUnits,
      },
    ];
  });
};

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();

  const today = getLocalDateString();
  const isNativeApp = Capacitor.isNativePlatform();
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [eventFilter, setEventFilter] = useState<CalendarEventFilter>("all");
  const [googleStartDate, setGoogleStartDate] = useState(today);
  const [googleEndDate, setGoogleEndDate] = useState(addDays(today, 30));
  const [googleSelectedPeptideIds, setGoogleSelectedPeptideIds] = useState<string[]>([]);
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [googleSyncMessage, setGoogleSyncMessage] = useState("");
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);
  const [isRepairingCalendar, setIsRepairingCalendar] = useState(false);
  const [isRepairingPastCalendar, setIsRepairingPastCalendar] = useState(false);
  const [calendarRepairMessage, setCalendarRepairMessage] = useState("");

  // Keep track of the active month and year for monthly navigation
  const initialDate = parseLocalDate(selectedDate);
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Query database
  const peptides = useLiveQuery(async () => activeRecords(await db.peptides.toArray()));
  const schedules = useLiveQuery(async () => activeRecords(await db.schedules.toArray()));
  const logs = useLiveQuery(async () => activeRecords(await db.injectionLogs.toArray()));
  const vaultUsers = useLiveQuery(async () => activeRecords(await db.vaultUsers.orderBy("sortOrder").toArray()));
  const settings = useLiveQuery(() => db.appSettings.toArray());
  const googleSyncedEventIds = useMemo(() => {
    const value = settings?.find((setting) => setting.key === googleSyncedEventIdsKey)?.value;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }, [settings]);
  const syringeDisplayMode = useMemo(() => {
    return settings?.find((setting) => setting.key === "pref_displayMode")?.value === "mL" ? "mL" : "units";
  }, [settings]);
  const googleSyncedEventIdSet = useMemo(() => new Set(googleSyncedEventIds), [googleSyncedEventIds]);
  const activeScheduledPeptides = useMemo(() => {
    if (!peptides || !schedules) return [];
    const activeScheduledIds = new Set(schedules.filter((schedule) => schedule.isActive).map((schedule) => schedule.peptideId));
    return peptides.filter((peptide) => activeScheduledIds.has(peptide.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [peptides, schedules]);

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  useEffect(() => {
    if (googleSelectedPeptideIds.length === 0 && activeScheduledPeptides.length > 0) {
      queueMicrotask(() => {
        setGoogleSelectedPeptideIds(activeScheduledPeptides.map((peptide) => peptide.id));
      });
    }
  }, [activeScheduledPeptides, googleSelectedPeptideIds.length]);

  const googleExportEvents = useMemo(() => {
    if (!peptides || !schedules || !logs) return [];
    return buildGoogleCalendarExportEvents(
      googleStartDate,
      googleEndDate,
      googleSelectedPeptideIds,
      peptides,
      schedules,
      logs
    );
  }, [googleEndDate, googleSelectedPeptideIds, googleStartDate, logs, peptides, schedules]);
  const googlePendingEvents = useMemo(
    () => googleExportEvents.filter((event) => !googleSyncedEventIdSet.has(event.id)),
    [googleExportEvents, googleSyncedEventIdSet]
  );
  const googleAlreadyAddedCount = googleExportEvents.length - googlePendingEvents.length;
  const googleExportPreview = googlePendingEvents.slice(0, 5);
  const allGooglePeptidesSelected =
    activeScheduledPeptides.length > 0 &&
    googleSelectedPeptideIds.length === activeScheduledPeptides.length;

  const toggleGooglePeptide = (peptideId: string) => {
    const current = new Set(googleSelectedPeptideIds);
    if (current.has(peptideId)) {
      current.delete(peptideId);
    } else {
      current.add(peptideId);
    }
    setGoogleSelectedPeptideIds([...current]);
  };

  const setAllGooglePeptides = () => {
    setGoogleSelectedPeptideIds(activeScheduledPeptides.map((peptide) => peptide.id));
  };

  const clearGooglePeptides = () => {
    setGoogleSelectedPeptideIds([]);
  };

  const handleAddToGoogleCalendar = async () => {
    setGoogleSyncMessage("");
    if (googleStartDate > googleEndDate) {
      setGoogleSyncMessage("Choose an end date after the start date.");
      return;
    }
    if (googleExportEvents.length === 0) {
      setGoogleSyncMessage("No selected injection events are ready to add.");
      return;
    }
    if (googlePendingEvents.length === 0) {
      setGoogleSyncMessage("Everything in this range has already been added from this device.");
      return;
    }
    if (isNativeApp) {
      setGoogleSyncMessage("Google Calendar export needs native OAuth setup in the app build. Use the web app or CSV/PDF export for this test build.");
      return;
    }

    setIsGoogleSyncing(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      provider.setCustomParameters({ prompt: "consent" });
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error("Google did not return calendar permission. Try again and allow calendar access.");
      }

      let createdCount = 0;
      const createdEventIds: string[] = [];
      for (const event of googlePendingEvents) {
        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildGoogleCalendarPayload(event)),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Google Calendar rejected one of the events.");
        }

        createdCount += 1;
        createdEventIds.push(event.id);
      }

      if (createdEventIds.length > 0) {
        await putAppSetting(googleSyncedEventIdsKey, [...new Set([...googleSyncedEventIds, ...createdEventIds])]);
      }

      setGoogleSyncMessage(
        `${createdCount} event${createdCount === 1 ? "" : "s"} added to Google Calendar.`
      );
    } catch (error) {
      setGoogleSyncMessage(error instanceof Error ? error.message : "Google Calendar sync failed.");
    } finally {
      setIsGoogleSyncing(false);
    }
  };

  const handleClearGoogleCalendarSyncMarks = async () => {
    await putAppSetting(googleSyncedEventIdsKey, []);
    setGoogleSyncMessage("Google Calendar added markers were cleared on this device.");
  };

  const handleRepairUpcomingCalendar = async () => {
    setCalendarRepairMessage("");
    if (!peptides || !schedules || !logs) return;

    setIsRepairingCalendar(true);
    try {
      const repairLogs = buildUpcomingCalendarRepairLogs(today, peptides, schedules, logs);
      if (repairLogs.length === 0) {
        setCalendarRepairMessage("Upcoming calendar is already in sync for the next year.");
        return;
      }

      await db.injectionLogs.bulkPut(repairLogs);
      setCalendarRepairMessage(
        `Restored ${repairLogs.length} upcoming injection${repairLogs.length === 1 ? "" : "s"} through ${addDays(
          today,
          calendarRepairWindowDays
        )}.`
      );
    } catch (error) {
      setCalendarRepairMessage(error instanceof Error ? error.message : "Calendar repair failed.");
    } finally {
      setIsRepairingCalendar(false);
    }
  };

  const handleRepairPastTakenCalendar = async () => {
    setCalendarRepairMessage("");
    if (!peptides || !schedules || !logs) return;

    const endDate = addDays(today, -1);
    const repair = buildPastTakenCalendarRepair(endDate, peptides, schedules, logs);
    const repairCount = repair.createdLogs.length + repair.updatedLogs.length;
    if (repairCount === 0) {
      setCalendarRepairMessage("No past scheduled injections need a taken-log repair.");
      return;
    }

    const confirmed = window.confirm(
      `Mark ${repairCount} past scheduled injection${repairCount === 1 ? "" : "s"} as taken? Use this only for schedules that were already being followed before the dosing schedule change.`
    );
    if (!confirmed) return;

    setIsRepairingPastCalendar(true);
    try {
      const nowIso = new Date().toISOString();
      await db.transaction("rw", [db.injectionLogs], async () => {
        if (repair.createdLogs.length > 0) {
          await db.injectionLogs.bulkPut(repair.createdLogs);
        }
        for (const log of repair.updatedLogs) {
          await db.injectionLogs.update(log.id, {
            status: "taken",
            actualDateTime: log.actualDateTime,
            doseValue: log.doseValue,
            doseUnit: log.doseUnit,
            drawMl: log.drawMl,
            drawUnits: log.drawUnits,
            notes: pastTakenRepairConvertedNote,
            updatedAt: nowIso,
          });
        }
      });
      setCalendarRepairMessage(
        `Marked ${repairCount} past scheduled injection${repairCount === 1 ? "" : "s"} as taken.`
      );
    } catch (error) {
      setCalendarRepairMessage(error instanceof Error ? error.message : "Past dosing schedule repair failed.");
    } finally {
      setIsRepairingPastCalendar(false);
    }
  };

  const handleRepairHistoryDoseAmounts = async () => {
    setCalendarRepairMessage("");
    if (!peptides || !schedules || !logs) return;

    const repairLogs = buildHistoryDoseRepair(peptides, schedules, logs);
    if (repairLogs.length === 0) {
      setCalendarRepairMessage("History dose amounts already match the current repaired schedules.");
      return;
    }

    const confirmed = window.confirm(
      `Update ${repairLogs.length} repaired history log${repairLogs.length === 1 ? "" : "s"} to match the current dosing schedule amounts?`
    );
    if (!confirmed) return;

    setIsRepairingPastCalendar(true);
    try {
      const nowIso = new Date().toISOString();
      await db.transaction("rw", [db.injectionLogs], async () => {
        for (const log of repairLogs) {
          await db.injectionLogs.update(log.id, {
            doseValue: log.doseValue,
            doseUnit: log.doseUnit,
            drawMl: log.drawMl,
            drawUnits: log.drawUnits,
            updatedAt: nowIso,
          });
        }
      });
      setCalendarRepairMessage(
        `Updated ${repairLogs.length} repaired history dose amount${repairLogs.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setCalendarRepairMessage(error instanceof Error ? error.message : "History dose repair failed.");
    } finally {
      setIsRepairingPastCalendar(false);
    }
  };

  const handleUndoPastTakenCalendarRepair = async () => {
    setCalendarRepairMessage("");
    if (!logs) return;

      const repairLogs = logs.filter((log) => pastTakenRepairNotes.has(log.notes || ""));
    if (repairLogs.length === 0) {
      setCalendarRepairMessage("No past schedule repair logs were found to undo.");
      return;
    }

    const confirmed = window.confirm(
      `Undo ${repairLogs.length} past repair log${repairLogs.length === 1 ? "" : "s"}? This will remove repair-created logs and turn repaired scheduled placeholders back into scheduled items.`
    );
    if (!confirmed) return;

    setIsRepairingPastCalendar(true);
    try {
      const nowIso = new Date().toISOString();
      await db.transaction("rw", [db.injectionLogs], async () => {
        for (const log of repairLogs) {
          if (
            log.notes === pastTakenRepairCreatedNote ||
            (log.notes === pastTakenRepairNote && log.createdAt === log.updatedAt)
          ) {
            await db.injectionLogs.update(log.id, {
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            await db.injectionLogs.update(log.id, {
              status: "scheduled",
              actualDateTime: undefined,
              notes: "Reverted past dosing schedule repair.",
              updatedAt: nowIso,
            });
          }
        }
      });
      setCalendarRepairMessage(`Undid ${repairLogs.length} past repair log${repairLogs.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setCalendarRepairMessage(error instanceof Error ? error.message : "Undo past repair failed.");
    } finally {
      setIsRepairingPastCalendar(false);
    }
  };

  // Generate grid based on view mode
  const daysGrid = useMemo(
    () =>
      viewMode === "month"
        ? generateMonthGrid(currentYear, currentMonth)
        : generateWeekGrid(selectedDate),
    [currentMonth, currentYear, selectedDate, viewMode]
  );

  const visibleEventsByDate = useMemo(() => {
    if (!peptides || !schedules || !logs || daysGrid.length === 0) {
      return new Map<string, DayEvent[]>();
    }

    return getEventsForDateRange(
      daysGrid[0].dateStr,
      daysGrid[daysGrid.length - 1].dateStr,
      peptides,
      schedules,
      logs
    );
  }, [daysGrid, logs, peptides, schedules]);

  const getDayEvents = useCallback(
    (dateStr: string) => visibleEventsByDate.get(dateStr) || [],
    [visibleEventsByDate]
  );

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.dateStr);
    const dateObj = parseLocalDate(day.dateStr);
    setCurrentYear(dateObj.getFullYear());
    setCurrentMonth(dateObj.getMonth());
  };

  // Navigations
  const handlePrev = () => {
    if (viewMode === "month") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else {
      // Shift selectedDate back 7 days
      const newDate = addDays(selectedDate, -7);
      setSelectedDate(newDate);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    } else {
      // Shift selectedDate forward 7 days
      const newDate = addDays(selectedDate, 7);
      setSelectedDate(newDate);
    }
  };

  // Quick Action logging from calendar list
  const handleLogAction = async (event: DayEvent, status: "taken" | "skipped") => {
    if (event.log) {
      // Update existing log
      await db.injectionLogs.update(event.log.id, {
        status,
        actualDateTime: status === "taken" ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const scheduledDose = event.schedule
        ? getScheduledDoseForDate(event.peptide, event.schedule, selectedDate)
        : {
            doseValue: event.peptide.desiredDoseValue,
            doseUnit: event.peptide.desiredDoseUnit,
          };
      const draw = getDrawForDose(
        scheduledDose.doseValue,
        scheduledDose.doseUnit,
        event.peptide.concentrationMcgPerMl,
        event.peptide.unitsPerMl
      );
      // Create new log
      const newLog: InjectionLog = {
        id: crypto.randomUUID(),
        peptideId: event.peptide.id,
        vaultUserId: event.peptide.vaultUserId,
        openVialId: event.peptide.openVialId || event.peptide.id,
        peptideNameSnapshot: event.peptide.name,
        scheduledDate: selectedDate,
        actualDateTime: status === "taken" ? new Date().toISOString() : undefined,
        doseValue: scheduledDose.doseValue,
        doseUnit: scheduledDose.doseUnit,
        drawMl: draw.drawMl,
        drawUnits: draw.drawUnits,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await logInjectionEvent(newLog);
    }
  };

  const handleClearLog = async (event: DayEvent) => {
    if (event.log) {
      await deleteInjectionLog(event.log.id);
    }
  };

  // Format header selected date
  const getSelectedDayHeader = () => {
    try {
      const date = parseLocalDate(selectedDate);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  };

  const currentMonthName = new Date(currentYear, currentMonth).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedDayEvents = useMemo(() => getDayEvents(selectedDate), [getDayEvents, selectedDate]);
  const allEvents = useMemo(
    () => daysGrid.flatMap((day) => getDayEvents(day.dateStr)),
    [daysGrid, getDayEvents]
  );
  const dueTodayEvents = useMemo(() => {
    if (!peptides || !schedules || !logs) return [];
    const visibleTodayEvents = visibleEventsByDate.get(today);
    return visibleTodayEvents || getEventsForDay(today, peptides, schedules, logs);
  }, [logs, peptides, schedules, today, visibleEventsByDate]);
  const dueTodayCount = dueTodayEvents.filter((event) => event.status === "due").length;
  const missedCount = allEvents.filter((event) => event.status === "missed").length;
  const filteredSelectedDayEvents = useMemo(() => selectedDayEvents.filter((event) => {
    if (eventFilter === "all") return true;
    if (eventFilter === "logged") return event.status === "completed" || event.status === "skipped";
    return event.status === eventFilter;
  }), [eventFilter, selectedDayEvents]);
  const userById = useMemo(() => new Map((vaultUsers || []).map((user) => [user.id, user])), [vaultUsers]);
  const groupedSelectedDayEvents = useMemo(() => Array.from(
    filteredSelectedDayEvents.reduce((groups, event) => {
      const userId = event.peptide.vaultUserId || DEFAULT_VAULT_USER_ID;
      groups.set(userId, [...(groups.get(userId) || []), event]);
      return groups;
    }, new Map<string, DayEvent[]>())
  ), [filteredSelectedDayEvents]);

  return (
    <div className="fade-in calendar-page" style={{ paddingBottom: "30px" }}>
      
      {/* Tab Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)" }}>
          Calendar
        </h1>

        {/* View Mode Toggle Switch */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--border-radius-sm)",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setViewMode("month")}
            style={{
              padding: "6px 12px",
              background: viewMode === "month" ? "var(--color-primary)" : "transparent",
              color: viewMode === "month" ? "#ffffff" : "var(--text-secondary)",
              border: "none",
              borderRadius: "4px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode("week")}
            style={{
              padding: "6px 12px",
              background: viewMode === "week" ? "var(--color-primary)" : "transparent",
              color: viewMode === "week" ? "#ffffff" : "var(--text-secondary)",
              border: "none",
              borderRadius: "4px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            Week
          </button>
        </div>
      </div>

      <div className="calendar-desktop-layout">
        <section className="calendar-grid-pane">
          {/* Navigation and Title */}
          <Card style={{ marginBottom: "16px", padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={handlePrev}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  padding: "6px",
                }}
              >
                <ChevronLeft size={20} />
              </button>
              
              <span style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
                {viewMode === "month" ? currentMonthName : "Weekly View"}
              </span>

              <button
                onClick={handleNext}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  padding: "6px",
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </Card>

          {/* Calendar Grid Container */}
          <Card style={{ marginBottom: "20px" }}>
            <CalendarGrid
              days={daysGrid}
              selectedDate={selectedDate}
              onDayClick={handleDayClick}
              getDayEvents={getDayEvents}
              vaultUsers={vaultUsers || []}
            />
          </Card>

          {(dueTodayCount > 0 || missedCount > 0) && (
            <Card style={{ marginBottom: "16px", border: "1px solid rgba(245, 158, 11, 0.35)" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AlertTriangle size={18} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: "2px" }} />
                <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {dueTodayCount > 0 && (
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>{dueTodayCount}</strong> injection
                      {dueTodayCount === 1 ? " is" : "s are"} due today.
                    </div>
                  )}
                  {missedCount > 0 && (
                    <div>
                      <strong style={{ color: "var(--color-danger)" }}>{missedCount}</strong> missed item
                      {missedCount === 1 ? "" : "s"} in the visible {viewMode}.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <RefreshCw size={18} style={{ color: "var(--color-primary)" }} />
              Calendar Repair
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "12px", lineHeight: 1.45 }}>
              Upcoming repair restores future schedule placeholders. Past repair creates real taken logs and can change next-dose and vial remaining calculations.
            </p>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleRepairUpcomingCalendar}
              disabled={isRepairingCalendar || isRepairingPastCalendar || !peptides || !schedules || !logs}
            >
              {isRepairingCalendar ? <Loader2 size={16} /> : <RefreshCw size={16} />}
              {isRepairingCalendar ? "Repairing..." : "Repair Upcoming Calendar"}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleRepairPastTakenCalendar}
              disabled={isRepairingCalendar || isRepairingPastCalendar || !peptides || !schedules || !logs}
              style={{ marginTop: "10px" }}
            >
              {isRepairingPastCalendar ? <Loader2 size={16} /> : <Check size={16} />}
              {isRepairingPastCalendar ? "Repairing..." : "Mark Past Schedule Taken"}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={handleUndoPastTakenCalendarRepair}
              disabled={isRepairingCalendar || isRepairingPastCalendar || !logs}
              style={{ marginTop: "8px" }}
            >
              <X size={16} />
              Undo Past Repair
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleRepairHistoryDoseAmounts}
              disabled={isRepairingCalendar || isRepairingPastCalendar || !peptides || !schedules || !logs}
              style={{ marginTop: "8px" }}
            >
              {isRepairingPastCalendar ? <Loader2 size={16} /> : <RefreshCw size={16} />}
              Repair History Dose Amounts
            </Button>
            {calendarRepairMessage && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "10px", lineHeight: 1.45 }}>
                {calendarRepairMessage}
              </p>
            )}
          </Card>

          <Card style={{ marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setIsGoogleCalendarOpen((open) => !open)}
              aria-expanded={isGoogleCalendarOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <h2 style={{ fontSize: "1.05rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarPlus size={18} style={{ color: "var(--color-primary)" }} />
                Add to Google Calendar
              </h2>
              {isGoogleCalendarOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isGoogleCalendarOpen && (
              <div style={{ marginTop: "12px" }}>
            <div className="form-row-grid" style={{ marginBottom: "10px" }}>
              <label className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">Start Date</span>
                <input
                  type="date"
                  className="form-control"
                  value={googleStartDate}
                  onChange={(event) => setGoogleStartDate(event.target.value)}
                />
              </label>
              <label className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">End Date</span>
                <input
                  type="date"
                  className="form-control"
                  value={googleEndDate}
                  onChange={(event) => setGoogleEndDate(event.target.value)}
                />
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
              <p className="form-label" style={{ margin: 0 }}>Injections</p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  aria-label="Select all injections for Google Calendar"
                  className="btn btn-secondary"
                  onClick={setAllGooglePeptides}
                  style={{ padding: "6px 10px", fontSize: "0.76rem" }}
                >
                  All
                </button>
                <button
                  type="button"
                  aria-label="Clear Google Calendar injection selection"
                  className="btn btn-secondary"
                  onClick={clearGooglePeptides}
                  style={{ padding: "6px 10px", fontSize: "0.76rem" }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
              {activeScheduledPeptides.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>No active dosing schedules found.</p>
              ) : (
                activeScheduledPeptides.map((peptide) => (
                  <label
                    key={peptide.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      background: googleSelectedPeptideIds.includes(peptide.id)
                        ? "rgba(99, 102, 241, 0.12)"
                        : "rgba(255,255,255,0.03)",
                      color: "var(--text-primary)",
                      fontSize: "0.86rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={googleSelectedPeptideIds.includes(peptide.id)}
                      onChange={() => toggleGooglePeptide(peptide.id)}
                    />
                    {peptide.name}
                  </label>
                ))
              )}
            </div>

            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "10px",
                background: "rgba(255,255,255,0.03)",
                color: "var(--text-secondary)",
                fontSize: "0.84rem",
                lineHeight: 1.45,
              }}
            >
              {googleStartDate > googleEndDate ? (
                <span style={{ color: "var(--color-danger)" }}>Choose an end date after the start date.</span>
              ) : (
                <>
                  {googleExportEvents.length} Google Calendar event{googleExportEvents.length === 1 ? "" : "s"} ready
                  {allGooglePeptidesSelected ? " for all active injections." : " for selected injections."}
                  {googleAlreadyAddedCount > 0 && (
                    <>
                      {" "}
                      {googleAlreadyAddedCount} already added from this device.
                    </>
                  )}
                </>
              )}
            </div>

            {googleExportPreview.length > 0 ? (
              <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
                {googleExportPreview.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      padding: "8px 10px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.peptideName}
                    </span>
                    <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
                      {event.date} {event.time}
                    </span>
                  </div>
                ))}
                {googlePendingEvents.length > googleExportPreview.length && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "center" }}>
                    Plus {googlePendingEvents.length - googleExportPreview.length} more new event
                    {googlePendingEvents.length - googleExportPreview.length === 1 ? "" : "s"}.
                  </p>
                )}
              </div>
            ) : googleExportEvents.length > 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "10px", textAlign: "center" }}>
                All selected events in this range are already marked as added from this device.
              </p>
            ) : null}

            {googleAlreadyAddedCount > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearGoogleCalendarSyncMarks}
                style={{ width: "100%", marginTop: "10px", padding: "8px 10px", fontSize: "0.78rem" }}
              >
                Reset Added Markers
              </button>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={handleAddToGoogleCalendar}
              disabled={isGoogleSyncing || googlePendingEvents.length === 0 || googleStartDate > googleEndDate}
              style={{ marginTop: "12px" }}
            >
              {isGoogleSyncing ? <Loader2 size={16} /> : <CalendarPlus size={16} />}
              {isGoogleSyncing ? "Adding Events..." : `Add ${googlePendingEvents.length} New Event${googlePendingEvents.length === 1 ? "" : "s"}`}
            </Button>

            {googleSyncMessage && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "10px", lineHeight: 1.45 }}>
                {googleSyncMessage}
              </p>
            )}
              </div>
            )}
          </Card>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
            {filterOptions.map((option) => {
              const active = eventFilter === option.value;
              return (
            <button
              key={option.value}
              type="button"
              onClick={() => setEventFilter(option.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "var(--border-radius-sm)",
                border: "1px solid",
                borderColor: active ? "var(--color-primary)" : "var(--border-color)",
                background: active ? "var(--color-primary)" : "rgba(255,255,255,0.03)",
                color: active ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
              );
            })}
          </div>
        </section>

      {/* Selected Date Details Panel */}
      <div className="calendar-details-pane" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3
          style={{
            fontSize: "0.95rem",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "4px",
          }}
        >
          {getSelectedDayHeader()}
        </h3>

        {filteredSelectedDayEvents.length === 0 ? (
          <div
            style={{
              padding: "30px 16px",
              textAlign: "center",
              border: "1px dashed var(--border-color)",
              borderRadius: "var(--border-radius-md)",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}
          >
            {selectedDayEvents.length === 0
              ? "No injections scheduled or logged for this day."
              : "No items match the selected filter for this day."}
          </div>
        ) : (
          groupedSelectedDayEvents.map(([userId, userEvents]) => {
            const user = userById.get(userId);
            return (
              <section key={userId} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: user?.color || "var(--color-primary)" }} />
                  <h4 style={{ fontSize: "0.95rem", margin: 0 }}>{user?.displayName || "User 1"}</h4>
                </div>
                {userEvents.map((event) => {
            const scheduledDose = event.schedule
              ? getScheduledDoseForDate(event.peptide, event.schedule, selectedDate)
              : {
                  doseValue: event.peptide.desiredDoseValue,
                  doseUnit: event.peptide.desiredDoseUnit,
                };
            const scheduledDraw = getDrawForDose(
              scheduledDose.doseValue,
              scheduledDose.doseUnit,
              event.peptide.concentrationMcgPerMl,
              event.peptide.unitsPerMl
            );
            return (
              <Card key={event.peptide.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4
                      onClick={() => navigate(`/vault/${event.peptide.id}`)}
                      style={{
                        fontSize: "1.1rem",
                        fontFamily: "var(--font-display)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {event.peptide.name}
                    </h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Dose: {formatDose(scheduledDose.doseValue, scheduledDose.doseUnit)}
                      {" • "}
                      Draw: {formatMl(scheduledDraw.drawMl)} / {formatUnits(scheduledDraw.drawUnits)}
                      {" • "}
                      Time: {event.schedule?.injectionTime || "09:00"}
                    </p>
                  </div>

                  <span className={`badge badge-${event.status}`}>
                    {event.status === "completed"
                      ? "Logged"
                      : event.status === "due"
                      ? "Due"
                      : event.status}
                  </span>
                </div>

                <SyringeVisualizer
                  drawMl={scheduledDraw.drawMl}
                  syringeSizeMl={event.peptide.syringeSizeMl}
                  unitsPerMl={event.peptide.unitsPerMl}
                  displayMode={syringeDisplayMode}
                />

                {/* Quick Action Logging Options */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "16px",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "12px",
                  }}
                >
                  {event.status === "completed" || event.status === "skipped" ? (
                    <Button variant="ghost" onClick={() => handleClearLog(event)} style={{ padding: "6px 12px" }}>
                      <X size={14} />
                      Clear Log
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" onClick={() => handleLogAction(event, "skipped")} style={{ padding: "6px 12px" }}>
                        <X size={14} style={{ color: "var(--color-danger)" }} />
                        Skip
                      </Button>
                      <Button variant="success" onClick={() => handleLogAction(event, "taken")} style={{ padding: "6px 12px" }}>
                        <Check size={14} />
                        Completed
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
              </section>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
};
