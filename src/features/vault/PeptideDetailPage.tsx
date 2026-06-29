import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { activeRecords, isActiveRecord } from "../../db/activeRecords";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { SyringeVisualizer } from "../../components/SyringeVisualizer";
import { deletePeptideWithSchedule, logInjectionEvent, deleteInjectionLog } from "./vaultUtils";
import {
  getNextScheduledDoseDate,
  getDaysUntilNextScheduledDose,
  getLocalDateString,
  getDoseScheduleOccurrences,
  getEstimatedRemainingDoses,
  getSharedOpenVialProjection,
  getScheduledDoseForDate,
  addDays,
  parseLocalDate,
  getCurrentVialLogs,
} from "../../utils/dateUtils";
import {
  formatMl,
  formatUnits,
  formatMgPerMl,
  formatMcgPerMl,
  formatDose,
} from "../../utils/formatting";
import { getPreferredSchedule } from "../../utils/scheduleUtils";
import { normalizeDoseToMcg } from "../calculator/calculatorUtils";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  FileText,
  Plus,
  Check,
  X,
  Calculator,
} from "lucide-react";
import type { InjectionLog } from "../../types/injectionLog";
import type { DoseUnit } from "../../types/peptide";
import type { DoseScheduleDurationType, DoseSchedulePhase, PeptideSchedule } from "../../types/schedule";

type LogStatus = "taken" | "skipped" | "missed" | "manual";
type InjectionSiteSide = "front" | "back";
type DoseScheduleRow = {
  id: string;
  startDate: string;
  durationType: DoseScheduleDurationType;
  durationValue: string;
  intervalDays: string;
  daysOfWeek: number[];
  doseValue: string;
  doseUnit: DoseUnit;
};

type PendingPastDoseSave = {
  phases: DoseSchedulePhase[];
  updatedSchedule: PeptideSchedule;
  pastDates: string[];
};

interface InjectionSite {
  id: string;
  label: string;
  side: InjectionSiteSide;
  x: number;
  y: number;
}

const isLogStatus = (value: string): value is LogStatus =>
  value === "taken" || value === "skipped" || value === "missed" || value === "manual";
const isDoseScheduleDurationType = (value: string): value is DoseScheduleDurationType =>
  value === "injections" || value === "weeks" || value === "daysOfWeek";
const isDoseUnit = (value: string): value is DoseUnit => value === "mcg" || value === "mg";

const makeDoseScheduleRow = (doseUnit: DoseUnit = "mg"): DoseScheduleRow => ({
  id: crypto.randomUUID(),
  startDate: "",
  durationType: "weeks",
  durationValue: "",
  intervalDays: "7",
  daysOfWeek: [],
  doseValue: "",
  doseUnit,
});

const getDefaultDoseScheduleRows = (doseUnit: DoseUnit): DoseScheduleRow[] => [
  makeDoseScheduleRow(doseUnit),
];

const phaseToRow = (phase: DoseSchedulePhase): DoseScheduleRow => ({
  id: phase.id,
  startDate: phase.startDate || "",
  durationType: phase.durationType,
  durationValue: phase.durationValue ? String(phase.durationValue) : "",
  intervalDays: phase.intervalDays ? String(phase.intervalDays) : "7",
  daysOfWeek: phase.daysOfWeek || [],
  doseValue: String(phase.doseValue),
  doseUnit: phase.doseUnit,
});

const getCurrentTimeString = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const buildLocalDateTimeIso = (date: string, time: string) => {
  if (!date || !time) return new Date().toISOString();
  return new Date(`${date}T${time}`).toISOString();
};

const getDrawForDose = (
  doseValue: number,
  doseUnit: DoseUnit,
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

const SectionToggle: React.FC<{
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}> = ({ title, description, isOpen, onToggle, action }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      marginBottom: isOpen ? "12px" : 0,
      borderBottom: isOpen ? "1px solid var(--border-color)" : "none",
      paddingBottom: isOpen ? "8px" : 0,
    }}
  >
    <button
      type="button"
      onClick={onToggle}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "none",
        border: "none",
        color: "var(--text-primary)",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
      }}
      aria-expanded={isOpen}
    >
      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      <div>
        <h3 style={{ fontSize: "1.05rem", marginBottom: description ? "4px" : 0 }}>{title}</h3>
        {description && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>
    </button>
    {action}
  </div>
);

const formatLogTime = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const injectionSites: InjectionSite[] = [
  { id: "front-left-upper-arm", label: "Left upper arm", side: "front", x: 30, y: 26 },
  { id: "front-right-upper-arm", label: "Right upper arm", side: "front", x: 70, y: 26 },
  { id: "front-left-upper-abdomen", label: "Left upper abdomen", side: "front", x: 45, y: 30 },
  { id: "front-right-upper-abdomen", label: "Right upper abdomen", side: "front", x: 55, y: 30 },
  { id: "front-left-lower-abdomen", label: "Left lower abdomen", side: "front", x: 45, y: 37 },
  { id: "front-right-lower-abdomen", label: "Right lower abdomen", side: "front", x: 55, y: 37 },
  { id: "front-left-outer-thigh", label: "Left outer thigh", side: "front", x: 37, y: 51 },
  { id: "front-left-inner-thigh", label: "Left inner thigh", side: "front", x: 45, y: 51 },
  { id: "front-right-inner-thigh", label: "Right inner thigh", side: "front", x: 55, y: 51 },
  { id: "front-right-outer-thigh", label: "Right outer thigh", side: "front", x: 63, y: 51 },
  { id: "back-left-tricep", label: "Left back of tricep", side: "back", x: 30, y: 26 },
  { id: "back-right-tricep", label: "Right back of tricep", side: "back", x: 70, y: 26 },
  { id: "back-left-hip", label: "Left hip", side: "back", x: 43, y: 40 },
  { id: "back-right-hip", label: "Right hip", side: "back", x: 57, y: 40 },
  { id: "back-left-glute", label: "Left glute", side: "back", x: 45, y: 46 },
  { id: "back-right-glute", label: "Right glute", side: "back", x: 55, y: 46 },
  { id: "back-left-thigh", label: "Left back thigh", side: "back", x: 44, y: 54 },
  { id: "back-right-thigh", label: "Right back thigh", side: "back", x: 56, y: 54 },
];

const weekdays = [
  { label: "S", value: 0 },
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
];

const buildUpdatedSchedule = (
  schedule: PeptideSchedule,
  phases: DoseSchedulePhase[],
  doseScheduleStartDate: string
): PeptideSchedule => ({
  ...schedule,
  doseSchedule: phases,
  doseScheduleStartDate,
  updatedAt: new Date().toISOString(),
});

const BodyOutline: React.FC<{ side: InjectionSiteSide }> = ({ side }) => (
  <img
    src={`/body-map/${side}.png`}
    alt=""
    aria-hidden="true"
    style={{
      width: "auto",
      height: "100%",
      maxWidth: "100%",
      display: "block",
      margin: "0 auto",
      objectFit: "contain",
      filter: "drop-shadow(0 12px 18px rgba(0, 0, 0, 0.45))",
      pointerEvents: "none",
      userSelect: "none",
    }}
  />
);

const InjectionSitePicker: React.FC<{
  selectedSiteId: string;
  onSelectSite: (site: InjectionSite) => void;
}> = ({ selectedSiteId, onSelectSite }) => {
  const selectedSite = injectionSites.find((site) => site.id === selectedSiteId);

  return (
    <div className="form-group">
      <span className="form-label">Injection Site</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        {(["front", "back"] as InjectionSiteSide[]).map((side) => (
          <div key={side} style={{ textAlign: "center" }}>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                marginBottom: "8px",
                textTransform: "uppercase",
              }}
            >
              {side}
            </div>
            <div
              style={{
                position: "relative",
                maxWidth: "178px",
                height: "326px",
                margin: "0 auto",
                padding: "8px 8px 10px",
                borderRadius: "16px",
                border: "1px solid var(--border-color)",
                background:
                  "radial-gradient(circle at 50% 18%, rgba(99, 102, 241, 0.16), transparent 42%), rgba(255, 255, 255, 0.025)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
              }}
            >
              <BodyOutline side={side} />
              {injectionSites
                .filter((site) => site.side === side)
                .map((site) => {
                  const selected = site.id === selectedSiteId;
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => onSelectSite(site)}
                      aria-label={site.label}
                      title={site.label}
                      style={{
                        position: "absolute",
                        left: `${site.x}%`,
                        top: `${site.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: selected ? "22px" : "16px",
                        height: selected ? "22px" : "16px",
                        borderRadius: "50%",
                        border: selected ? "3px solid rgba(255,255,255,0.92)" : "1px solid rgba(255,255,255,0.48)",
                        background: selected ? "var(--color-success)" : "rgba(20, 184, 166, 0.86)",
                        boxShadow: selected
                          ? "0 0 0 5px rgba(16, 185, 129, 0.24), 0 6px 14px rgba(0, 0, 0, 0.28)"
                          : "0 0 0 4px rgba(20, 184, 166, 0.1), 0 4px 10px rgba(0, 0, 0, 0.2)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "10px",
          padding: "10px 12px",
          borderRadius: "var(--border-radius-sm)",
          border: "1px solid var(--border-color)",
          background: "rgba(255,255,255,0.02)",
          color: selectedSite ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: "0.85rem",
        }}
      >
        {selectedSite ? selectedSite.label : "Tap a dot to record the injection site"}
      </div>
    </div>
  );
};

export const PeptideDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today = getLocalDateString();

  // Dialog state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(today);
  const [logTime, setLogTime] = useState(getCurrentTimeString());
  const [logStatus, setLogStatus] = useState<LogStatus>("taken");
  const [logNotes, setLogNotes] = useState("");
  const [selectedInjectionSiteId, setSelectedInjectionSiteId] = useState("");
  const [isReconstitutionOpen, setIsReconstitutionOpen] = useState(false);
  const [isProjectionOpen, setIsProjectionOpen] = useState(false);
  const [isDosingScheduleOpen, setIsDosingScheduleOpen] = useState(false);
  const [isInjectionHistoryOpen, setIsInjectionHistoryOpen] = useState(false);
  const [doseScheduleStartDate, setDoseScheduleStartDate] = useState(today);
  const [pendingPastDoseSave, setPendingPastDoseSave] = useState<PendingPastDoseSave | null>(null);
  const [doseScheduleRows, setDoseScheduleRows] = useState<DoseScheduleRow[]>(() =>
    getDefaultDoseScheduleRows("mg")
  );

  // Load peptide, schedule, logs, and settings
  const data = useLiveQuery(async () => {
    if (!id) return null;
    const peptide = await db.peptides.get(id);
    if (!peptide || !isActiveRecord(peptide)) return null;
    const peptideSchedules = activeRecords(await db.schedules.where("peptideId").equals(id).toArray());
    const schedule = getPreferredSchedule(peptideSchedules, id);
    const peptides = activeRecords(await db.peptides.toArray());
    const schedules = activeRecords(await db.schedules.toArray());
    const logsList = activeRecords(await db.injectionLogs.where("peptideId").equals(id).reverse().sortBy("scheduledDate"));
    const allLogs = activeRecords(await db.injectionLogs.toArray());
    const settings = await db.appSettings.toArray();
    return { peptide, schedule, peptides, schedules, logsList, allLogs, settings };
  }, [id]);

  useEffect(() => {
    if (!data?.peptide) return;
    const peptideData = data.peptide;
    const scheduleData = data.schedule;
    const rows = data.schedule?.doseSchedule?.length
      ? data.schedule.doseSchedule.map(phaseToRow)
      : getDefaultDoseScheduleRows(peptideData.desiredDoseUnit);
    queueMicrotask(() => {
      setDoseScheduleRows(rows);
      setDoseScheduleStartDate(
        scheduleData?.doseScheduleStartDate || scheduleData?.startDate || today
      );
    });
  }, [data?.peptide, data?.schedule, today]);

  if (!data || !data.peptide) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Peptide not found.</p>
        <Button variant="secondary" onClick={() => navigate("/vault")} style={{ marginTop: "12px" }}>
          Back to Vault
        </Button>
      </div>
    );
  }

  const { peptide, schedule, peptides, schedules, logsList, allLogs, settings } = data;
  const currentVialLogs = getCurrentVialLogs(peptide, allLogs);
  const historyLogs = logsList.filter((log) => log.status !== "scheduled");
  const syringeDisplayMode = settings?.find((item) => item.key === "pref_displayMode")?.value === "mL" ? "mL" : "units";

  // Calculate schedule projections
  const loggedDates = new Set(
    logsList.filter((l) => l.status !== "scheduled").map((l) => l.scheduledDate)
  );

  const nextDate = schedule ? getNextScheduledDoseDate(schedule, today, loggedDates) : "";
  const daysUntilNext = schedule ? getDaysUntilNextScheduledDose(schedule, today, loggedDates) : null;
  const emptyDate = getSharedOpenVialProjection(peptide, peptides, schedules, allLogs, today).emptyDate;
  const nextScheduledDose =
    schedule && nextDate
      ? getScheduledDoseForDate(peptide, schedule, nextDate)
      : {
          doseValue: peptide.desiredDoseValue,
          doseUnit: peptide.desiredDoseUnit,
        };
  const nextScheduledDraw = getDrawForDose(
    nextScheduledDose.doseValue,
    nextScheduledDose.doseUnit,
    peptide.concentrationMcgPerMl,
    peptide.unitsPerMl
  );

  const daysUntilEmpty =
    emptyDate && schedule
      ? Math.round(
          (parseLocalDate(emptyDate).getTime() - parseLocalDate(today).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  // Calculate remaining vial volume
  const takenLogs = currentVialLogs.filter((l) => l.status === "taken" || l.status === "manual");
  const totalTakenMcg = takenLogs.reduce((sum, log) => {
    return sum + normalizeDoseToMcg(log.doseValue, log.doseUnit);
  }, 0);
  const totalVialMcg = peptide.vialMg * 1000;
  const remainingMcg = Math.max(0, totalVialMcg - totalTakenMcg);
  const remainingMg = remainingMcg / 1000;
  const remainingPercent = totalVialMcg > 0 ? (remainingMcg / totalVialMcg) * 100 : 0;
  const remainingDosesCount = schedule
    ? getEstimatedRemainingDoses(peptide, schedule, currentVialLogs, today)
    : Math.floor(remainingMcg / normalizeDoseToMcg(peptide.desiredDoseValue, peptide.desiredDoseUnit));

  const handleDelete = async () => {
    if (confirm(`Stop tracking ${peptide.name} for this user? Past logs will stay attached to the shared vial.`)) {
      await deletePeptideWithSchedule(peptide.id);
      navigate("/vault");
    }
  };

  const handleRefillVial = () => {
    navigate("/vault/add", {
      state: {
        prefilledName: peptide.name,
        peptideMg: peptide.vialMg,
        bacWaterMl: peptide.bacWaterMl,
        desiredDoseValue: peptide.desiredDoseValue,
        desiredDoseUnit: peptide.desiredDoseUnit,
        syringeSizeMl: peptide.syringeSizeMl,
        unitsPerMl: peptide.unitsPerMl,
      },
    });
  };

  const handleRecalculate = () => {
    navigate("/calculator", {
      state: {
        peptideMg: peptide.vialMg,
        bacWaterMl: peptide.bacWaterMl,
        desiredDoseValue: peptide.desiredDoseValue,
        desiredDoseUnit: peptide.desiredDoseUnit,
        syringeSizeMl: peptide.syringeSizeMl,
        unitsPerMl: peptide.unitsPerMl,
      },
    });
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedInjectionSite = injectionSites.find((site) => site.id === selectedInjectionSiteId);
    const nowIso = new Date().toISOString();
    const isActualInjection = logStatus === "taken" || logStatus === "manual";
    const scheduledDose = schedule
      ? getScheduledDoseForDate(peptide, schedule, logDate)
      : { doseValue: peptide.desiredDoseValue, doseUnit: peptide.desiredDoseUnit };
    const draw = getDrawForDose(
      scheduledDose.doseValue,
      scheduledDose.doseUnit,
      peptide.concentrationMcgPerMl,
      peptide.unitsPerMl
    );

    const newLog: InjectionLog = {
      id: crypto.randomUUID(),
      peptideId: peptide.id,
      vaultUserId: peptide.vaultUserId,
      openVialId: peptide.openVialId || peptide.id,
      peptideNameSnapshot: peptide.name,
      scheduledDate: logDate,
      actualDateTime: isActualInjection ? buildLocalDateTimeIso(logDate, logTime) : undefined,
      doseValue: scheduledDose.doseValue,
      doseUnit: scheduledDose.doseUnit,
      drawMl: draw.drawMl,
      drawUnits: draw.drawUnits,
      status: logStatus,
      injectionSiteId: isActualInjection ? selectedInjectionSite?.id : undefined,
      injectionSiteLabel: isActualInjection ? selectedInjectionSite?.label : undefined,
      injectionSiteSide: isActualInjection ? selectedInjectionSite?.side : undefined,
      notes: logNotes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await logInjectionEvent(newLog);
    setIsLogModalOpen(false);
    setLogNotes("");
    setSelectedInjectionSiteId("");
  };

  const handleQuickLogToday = async () => {
    const scheduledDose = schedule
      ? getScheduledDoseForDate(peptide, schedule, today)
      : { doseValue: peptide.desiredDoseValue, doseUnit: peptide.desiredDoseUnit };
    const draw = getDrawForDose(
      scheduledDose.doseValue,
      scheduledDose.doseUnit,
      peptide.concentrationMcgPerMl,
      peptide.unitsPerMl
    );

    // Quick log today's scheduled dose as taken
    const quickLog: InjectionLog = {
      id: crypto.randomUUID(),
      peptideId: peptide.id,
      vaultUserId: peptide.vaultUserId,
      openVialId: peptide.openVialId || peptide.id,
      peptideNameSnapshot: peptide.name,
      scheduledDate: today,
      actualDateTime: new Date().toISOString(),
      doseValue: scheduledDose.doseValue,
      doseUnit: scheduledDose.doseUnit,
      drawMl: draw.drawMl,
      drawUnits: draw.drawUnits,
      status: "taken",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await logInjectionEvent(quickLog);
  };

  const handleDeleteLog = async (logId: string) => {
    if (confirm("Remove this log entry?")) {
      await deleteInjectionLog(logId);
    }
  };

  const updateDoseScheduleRow = (
    rowId: string,
    updates: Partial<Omit<DoseScheduleRow, "id">>
  ) => {
    setDoseScheduleRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
    );
  };

  const handleAddDoseScheduleRow = () => {
    setDoseScheduleRows((rows) => [...rows, makeDoseScheduleRow(peptide.desiredDoseUnit)]);
  };

  const handleRemoveDoseScheduleRow = (rowId: string) => {
    setDoseScheduleRows((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((row) => row.id !== rowId);
    });
  };

  const toggleDoseScheduleDay = (rowId: string, day: number) => {
    setDoseScheduleRows((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const daysOfWeek = row.daysOfWeek.includes(day)
          ? row.daysOfWeek.filter((value) => value !== day)
          : [...row.daysOfWeek, day].sort();
        return { ...row, daysOfWeek };
      })
    );
  };

  const saveDoseScheduleWithPastLogs = async (
    phases: DoseSchedulePhase[],
    updatedSchedule: PeptideSchedule,
    pastDates: string[]
  ) => {
    const nowIso = new Date().toISOString();
    await db.transaction("rw", [db.schedules, db.injectionLogs], async () => {
      await db.schedules.update(updatedSchedule.id, {
        doseSchedule: phases,
        doseScheduleStartDate: updatedSchedule.doseScheduleStartDate,
        updatedAt: nowIso,
      });

      for (const scheduledDate of pastDates) {
        const dose = getScheduledDoseForDate(peptide, updatedSchedule, scheduledDate);
        const draw = getDrawForDose(
          dose.doseValue,
          dose.doseUnit,
          peptide.concentrationMcgPerMl,
          peptide.unitsPerMl
        );

        await db.injectionLogs.put({
          id: crypto.randomUUID(),
          peptideId: peptide.id,
          vaultUserId: peptide.vaultUserId,
          openVialId: peptide.openVialId || peptide.id,
          peptideNameSnapshot: peptide.name,
          scheduledDate,
          actualDateTime: buildLocalDateTimeIso(scheduledDate, "12:00"),
          doseValue: dose.doseValue,
          doseUnit: dose.doseUnit,
          drawMl: draw.drawMl,
          drawUnits: draw.drawUnits,
          status: "taken",
          notes: "Auto-logged from verified past dosing schedule.",
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });
  };

  const handleConfirmPastDoses = async () => {
    if (!pendingPastDoseSave) return;
    await saveDoseScheduleWithPastLogs(
      pendingPastDoseSave.phases,
      pendingPastDoseSave.updatedSchedule,
      pendingPastDoseSave.pastDates
    );
    setPendingPastDoseSave(null);
  };

  const handleDenyPastDoses = async () => {
    if (!pendingPastDoseSave) return;
    await saveDoseScheduleWithPastLogs(
      pendingPastDoseSave.phases,
      pendingPastDoseSave.updatedSchedule,
      []
    );
    setPendingPastDoseSave(null);
  };

  const handleSaveDoseSchedule = async () => {
    if (!schedule) {
      alert("Save this peptide before editing its dosing schedule.");
      return;
    }
    if (!doseScheduleStartDate) {
      alert("Please choose the start date for the first dosing phase.");
      return;
    }

    const phases: DoseSchedulePhase[] = [];
    for (const [index, row] of doseScheduleRows.entries()) {
      const isLast = index === doseScheduleRows.length - 1;
      const dose = parseFloat(row.doseValue);
      const duration = parseInt(row.durationValue, 10);
      const interval = parseInt(row.intervalDays, 10);
      const isDaySpecificPhase = row.durationType === "daysOfWeek";
      if (isNaN(dose) || dose <= 0) {
        alert("Each dosing schedule line needs a valid dose.");
        return;
      }
      if (row.durationType === "injections" && (isNaN(interval) || interval <= 0)) {
        alert("Every X Days dosing lines need a valid interval.");
        return;
      }
      if (!isLast && (isNaN(duration) || duration <= 0)) {
        alert("Each dosing schedule line before the last needs a valid duration.");
        return;
      }
      if (isDaySpecificPhase && row.daysOfWeek.length === 0) {
        alert("Select at least one day of the week for any Days of Wk dosing line.");
        return;
      }
      if (index > 0 && row.startDate && row.startDate < doseScheduleStartDate) {
        alert("A phase start date cannot be before the first phase start date.");
        return;
      }
      phases.push({
        id: row.id,
        startDate: index > 0 && row.startDate ? row.startDate : undefined,
        durationType: row.durationType,
        durationValue: isLast ? undefined : duration,
        intervalDays: row.durationType === "injections" ? interval : undefined,
        daysOfWeek: isDaySpecificPhase ? row.daysOfWeek : undefined,
        doseValue: dose,
        doseUnit: row.doseUnit,
        isContinuous: isLast,
      });
    }

    const updatedSchedule = buildUpdatedSchedule(schedule, phases, doseScheduleStartDate);

    const existingLogDates = new Set(
      logsList
        .filter((log) => log.status !== "scheduled")
        .map((log) => log.scheduledDate)
    );
    const pastDates =
      doseScheduleStartDate < today
        ? getDoseScheduleOccurrences(updatedSchedule, doseScheduleStartDate, addDays(today, -1)).map(
            (occurrence) => occurrence.date
          ).filter(
            (date) => !existingLogDates.has(date)
          )
        : [];

    if (pastDates.length > 0) {
      setPendingPastDoseSave({ phases, updatedSchedule, pastDates });
      return;
    }

    await saveDoseScheduleWithPastLogs(phases, updatedSchedule, []);
  };

  const getFriendlyDate = (dateStr: string) => {
    if (!dateStr) return "Not scheduled";
    if (dateStr === today) return "Today";
    if (dateStr === addDays(today, 1)) return "Tomorrow";

    try {
      const date = parseLocalDate(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const firstDosePhase = schedule?.doseSchedule?.find((phase) => phase.doseValue > 0);
  const scheduleBadgeLabel = firstDosePhase
    ? firstDosePhase.durationType === "daysOfWeek"
      ? "Days of Week Dose"
      : firstDosePhase.durationType === "injections"
      ? `Every ${firstDosePhase.intervalDays || schedule?.intervalDays || 1} Days`
      : "Weekly Dose"
    : "No Active Schedule";

  return (
    <div className="fade-in" style={{ paddingBottom: "40px" }}>
      {/* Navigation & Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => navigate("/vault")}
            aria-label="Back to Vault"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: "1.4rem" }}>Peptide Details</h1>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => navigate(`/vault/edit/${peptide.id}`)}
            aria-label={`Edit ${peptide.name}`}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              cursor: "pointer",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleRecalculate}
            aria-label={`Recalculate ${peptide.name}`}
            title="Recalculate reconstitution"
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid var(--color-primary)",
              color: "var(--color-primary)",
              cursor: "pointer",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Calculator size={16} />
          </button>
          <button
            onClick={handleRefillVial}
            aria-label={`Refill ${peptide.name}`}
            title="Refill vial"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid var(--color-success)",
              color: "var(--color-success)",
              cursor: "pointer",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={16} />
          </button>
          <button
            onClick={handleDelete}
            aria-label={`Delete ${peptide.name}`}
            style={{
              background: "rgba(244, 63, 94, 0.1)",
              border: "1px solid var(--color-danger)",
              color: "var(--color-danger)",
              cursor: "pointer",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <Card style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", marginBottom: "4px" }}>
          {peptide.name}
        </h2>
        <span className="badge badge-due" style={{ marginBottom: "16px" }}>
          {scheduleBadgeLabel}
        </span>

        {/* Vial Capacity Progress */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
            <span>Vial Status</span>
            <span>
              {remainingMg.toFixed(2)} mg remaining ({remainingPercent.toFixed(0)}%)
            </span>
          </div>
          <div
            style={{
              height: "6px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${remainingPercent}%`,
                background:
                  remainingPercent > 30
                    ? "var(--gradient-success)"
                    : remainingPercent > 10
                    ? "var(--gradient-warning)"
                    : "var(--gradient-danger)",
              }}
            />
          </div>
        </div>

        {/* Big Draw Amount Callout */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            padding: "16px",
            borderRadius: "var(--border-radius-sm)",
            border: "1px dashed var(--border-color)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Injection Draw
          </span>
          <h1 style={{ fontSize: "1.8rem", color: "var(--color-primary)", margin: "4px 0", fontFamily: "var(--font-display)" }}>
            {formatMl(nextScheduledDraw.drawMl)} / {formatUnits(nextScheduledDraw.drawUnits)}
          </h1>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Dose: {formatDose(nextScheduledDose.doseValue, nextScheduledDose.doseUnit)}
          </span>

          <SyringeVisualizer
            drawMl={nextScheduledDraw.drawMl}
            syringeSizeMl={peptide.syringeSizeMl}
            unitsPerMl={peptide.unitsPerMl}
            displayMode={syringeDisplayMode}
          />
        </div>
      </Card>

      {/* Grid of Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
        
        {/* Reconstitution details card */}
        <Card>
          <SectionToggle
            title="Reconstitution Parameters"
            isOpen={isReconstitutionOpen}
            onToggle={() => setIsReconstitutionOpen((open) => !open)}
          />
          {isReconstitutionOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Peptide Weight</span>
                <span style={{ fontWeight: 500 }}>{peptide.vialMg} mg</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>BAC Water Volume</span>
                <span style={{ fontWeight: 500 }}>{peptide.bacWaterMl} mL</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Concentration</span>
                <span style={{ fontWeight: 500 }}>
                  {formatMgPerMl(peptide.concentrationMgPerMl)} / {formatMcgPerMl(peptide.concentrationMcgPerMl)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Syringe Size / Calibration</span>
                <span style={{ fontWeight: 500 }}>
                  {peptide.syringeSizeMl} mL ({peptide.unitsPerMl} units/mL)
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Schedule & Projections card */}
        <Card>
          <SectionToggle
            title="Schedule & Projections"
            isOpen={isProjectionOpen}
            onToggle={() => setIsProjectionOpen((open) => !open)}
          />
          {isProjectionOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Next Dose Due</span>
                <span style={{ fontWeight: 600, color: "var(--color-warning)" }}>
                  {getFriendlyDate(nextDate)} {daysUntilNext === 0 ? "(Today)" : daysUntilNext !== null ? `(in ${daysUntilNext} d)` : ""}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Dose Time</span>
                <span style={{ fontWeight: 500 }}>{schedule?.injectionTime || "09:00"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Est. Doses Remaining</span>
                <span style={{ fontWeight: 500 }}>
                  {remainingDosesCount} doses
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Est. Empty Date</span>
                <span style={{ fontWeight: 500, color: daysUntilEmpty !== null && daysUntilEmpty <= 7 ? "var(--color-danger)" : "var(--text-primary)" }}>
                  {getFriendlyDate(emptyDate || "")}
                </span>
              </div>
              {schedule?.doseScheduleStartDate && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Dosing Starts</span>
                  <span style={{ fontWeight: 500 }}>{getFriendlyDate(schedule.doseScheduleStartDate)}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionToggle
            title="Dosing Schedule"
            description="Add one or more dose phases. The last line is treated as continuous."
            isOpen={isDosingScheduleOpen}
            onToggle={() => setIsDosingScheduleOpen((open) => !open)}
            action={
              isDosingScheduleOpen ? (
              <button
                type="button"
                onClick={handleAddDoseScheduleRow}
                style={{
                  flexShrink: 0,
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid var(--color-primary)",
                  background: "rgba(99, 102, 241, 0.1)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Add dosing phase"
              >
                <Plus size={18} />
              </button>
              ) : null
            }
          />

          {isDosingScheduleOpen && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {doseScheduleRows.map((row, index) => {
                  const isLast = index === doseScheduleRows.length - 1;
                  const showDaysOfWeek = row.durationType === "daysOfWeek";
                  const canRemovePhase = isLast && doseScheduleRows.length > 1;
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "var(--border-radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: isLast ? "rgba(16, 185, 129, 0.06)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          display: "grid",
                          gridTemplateColumns: canRemovePhase
                            ? "minmax(0, 1fr) minmax(0, 1fr) 42px"
                            : "minmax(0, 1fr) minmax(0, 1fr)",
                          gap: "8px",
                          alignItems: "end",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Select
                            label="Based On"
                            value={row.durationType}
                            onChange={(e) => {
                              if (isDoseScheduleDurationType(e.target.value)) {
                                updateDoseScheduleRow(row.id, {
                                  durationType: e.target.value,
                                  durationValue: "",
                                });
                              }
                            }}
                            options={[
                              { value: "injections", label: "Every X Days" },
                              { value: "weeks", label: "Weekly" },
                              { value: "daysOfWeek", label: "Days of Wk" },
                            ]}
                          />
                        </div>
                        <Input
                          label={`Phase ${index + 1} Start`}
                          type="date"
                          value={index === 0 ? doseScheduleStartDate : row.startDate}
                          onChange={(e) => {
                            if (index === 0) {
                              setDoseScheduleStartDate(e.target.value);
                            } else {
                              updateDoseScheduleRow(row.id, { startDate: e.target.value });
                            }
                          }}
                          required={index === 0}
                        />
                        {canRemovePhase && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDoseScheduleRow(row.id)}
                            aria-label="Remove dosing phase"
                            title="Remove dosing phase"
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "var(--border-radius-sm)",
                              border: "1px solid rgba(244, 63, 94, 0.45)",
                              background: "rgba(244, 63, 94, 0.08)",
                              color: "var(--color-danger)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              marginBottom: "18px",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {showDaysOfWeek ? (
                        <>
                          {!isLast && (
                            <Input
                              label="Weeks"
                              type="number"
                              inputMode="numeric"
                              value={row.durationValue}
                              onChange={(e) => updateDoseScheduleRow(row.id, { durationValue: e.target.value })}
                              min="1"
                              placeholder="e.g. 4"
                            />
                          )}
                          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                            <span className="form-label">Days of Week</span>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, minmax(34px, 1fr))",
                                gap: "6px",
                                marginTop: "6px",
                                marginBottom: "6px",
                              }}
                            >
                              {weekdays.map((day) => {
                                const active = row.daysOfWeek.includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDoseScheduleDay(row.id, day.value)}
                                    style={{
                                      minWidth: "34px",
                                      height: "38px",
                                      borderRadius: "50%",
                                      border: "1px solid",
                                      borderColor: active ? "var(--color-primary)" : "var(--border-color)",
                                      background: active ? "var(--color-primary)" : "transparent",
                                      color: active ? "#ffffff" : "var(--text-secondary)",
                                      fontWeight: 600,
                                      fontSize: "0.85rem",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : row.durationType === "injections" ? (
                        <>
                          <Input
                            label="Every"
                            type="number"
                            inputMode="numeric"
                            value={row.intervalDays}
                            onChange={(e) => updateDoseScheduleRow(row.id, { intervalDays: e.target.value })}
                            min="1"
                            placeholder="e.g. 3"
                            suffix="days"
                          />
                          {!isLast && (
                            <Input
                              label="Length"
                              type="number"
                              inputMode="numeric"
                              value={row.durationValue}
                              onChange={(e) => updateDoseScheduleRow(row.id, { durationValue: e.target.value })}
                              min="1"
                              placeholder="e.g. 8"
                              suffix="doses"
                            />
                          )}
                        </>
                      ) : (
                        <Input
                          label={isLast ? "Length" : "Weeks"}
                          type="number"
                          inputMode="numeric"
                          value={isLast ? "" : row.durationValue}
                          onChange={(e) => updateDoseScheduleRow(row.id, { durationValue: e.target.value })}
                          min="1"
                          placeholder={isLast ? "Continuous" : "e.g. 4"}
                          disabled={isLast}
                        />
                      )}
                      <Input
                        label="Dose"
                        type="number"
                        inputMode="decimal"
                        value={row.doseValue}
                        onChange={(e) => updateDoseScheduleRow(row.id, { doseValue: e.target.value })}
                        min="0.01"
                        step="any"
                        placeholder="e.g. 2"
                      />
                      <Select
                        label="Unit"
                        value={row.doseUnit}
                        onChange={(e) => {
                          if (isDoseUnit(e.target.value)) updateDoseScheduleRow(row.id, { doseUnit: e.target.value });
                        }}
                        options={[
                          { value: "mcg", label: "mcg" },
                          { value: "mg", label: "mg" },
                        ]}
                      />
                      {isLast && (
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            color: "var(--color-success)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          Continuous phase
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button variant="primary" fullWidth style={{ marginTop: "12px" }} onClick={handleSaveDoseSchedule}>
                Save Dosing Schedule
              </Button>
            </>
          )}
        </Card>

        {/* Notes card */}
        {peptide.notes && (
          <Card>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={16} />
              Notes
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
              {peptide.notes}
            </p>
          </Card>
        )}

        {/* Quick Log Action Bar */}
        {daysUntilNext === 0 && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid var(--color-success)",
              borderRadius: "var(--border-radius-md)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-success)" }}>
              <Check size={20} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Injection Due Today!</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="success" fullWidth onClick={handleQuickLogToday}>
                Quick Log Taken
              </Button>
              <Button variant="secondary" onClick={() => setIsLogModalOpen(true)}>
                Options
              </Button>
            </div>
          </div>
        )}

        {/* Log History */}
        <Card style={{ marginBottom: "20px" }}>
          <SectionToggle
            title="Injection History"
            description={`${historyLogs.length} log${historyLogs.length === 1 ? "" : "s"}`}
            isOpen={isInjectionHistoryOpen}
            onToggle={() => setIsInjectionHistoryOpen((open) => !open)}
            action={
              <button
                onClick={() => {
                  setLogDate(today);
                  setLogTime(getCurrentTimeString());
                  setLogStatus("taken");
                  setSelectedInjectionSiteId("");
                  setIsLogModalOpen(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
                Add Log
              </button>
            }
          />

          {isInjectionHistoryOpen && historyLogs.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              No history logged yet.
            </p>
          ) : isInjectionHistoryOpen ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {historyLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "var(--border-radius-sm)",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 500 }}>{getFriendlyDate(log.scheduledDate)}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formatLogTime(log.actualDateTime)
                        ? `${formatLogTime(log.actualDateTime)} · `
                        : ""}
                      Dose: {formatDose(log.doseValue, log.doseUnit)} ({formatMl(log.drawMl)})
                    </span>
                    {log.injectionSiteLabel && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Site: {log.injectionSiteLabel}
                      </span>
                    )}
                    {log.notes && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "2px" }}>
                        Note: {log.notes}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={`badge badge-${log.status}`}>
                      {log.status}
                    </span>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-danger)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      {/* Log Injection Modal Dialog */}
      {isLogModalOpen && createPortal(
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: "620px",
              width: "min(620px, calc(100vw - 32px))",
              maxHeight: "calc(100dvh - 24px)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Log Injection</h3>
            
            <form onSubmit={handleLogSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-row-grid">
                <Input
                  label="Date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                />
                <Input
                  label="Time"
                  type="time"
                  value={logTime}
                  onChange={(e) => setLogTime(e.target.value)}
                  required={logStatus === "taken" || logStatus === "manual"}
                  disabled={logStatus === "skipped" || logStatus === "missed"}
                />
              </div>

              <Select
                label="Status"
                value={logStatus}
                onChange={(e) => {
                  if (isLogStatus(e.target.value)) setLogStatus(e.target.value);
                }}
                options={[
                  { value: "taken", label: "Completed / Taken" },
                  { value: "skipped", label: "Skipped" },
                  { value: "missed", label: "Missed" },
                  { value: "manual", label: "Manual past entry" },
                ]}
              />

              <InjectionSitePicker
                selectedSiteId={selectedInjectionSiteId}
                onSelectSite={(site) => setSelectedInjectionSiteId(site.id)}
              />

              <div className="form-group">
                <label htmlFor="log-notes" className="form-label">
                  Log Notes (optional)
                </label>
                <textarea
                  id="log-notes"
                  className="form-control"
                  style={{ minHeight: "60px", resize: "vertical" }}
                  placeholder="e.g. Injected in left thigh, minor bruising..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <Button type="button" variant="secondary" fullWidth onClick={() => setIsLogModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" fullWidth>
                  Save Log
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {pendingPastDoseSave && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Confirm Past Doses</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              This dosing schedule starts in the past and has{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {pendingPastDoseSave.pastDates.length}
              </strong>{" "}
              past dose{pendingPastDoseSave.pastDates.length === 1 ? "" : "s"} without a log.
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginTop: "8px" }}>
              First missing dose: {getFriendlyDate(pendingPastDoseSave.pastDates[0])}
              <br />
              Last missing dose: {getFriendlyDate(pendingPastDoseSave.pastDates[pendingPastDoseSave.pastDates.length - 1])}
            </p>
            <p style={{ color: "var(--text-primary)", fontSize: "0.92rem", fontWeight: 700, marginTop: "14px" }}>
              Were all of those past doses taken?
            </p>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <Button type="button" variant="secondary" fullWidth onClick={handleDenyPastDoses}>
                No
              </Button>
              <Button type="button" variant="primary" fullWidth onClick={handleConfirmPastDoses}>
                Yes
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
