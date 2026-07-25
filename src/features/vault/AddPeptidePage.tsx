import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { activeRecords, isActiveRecord } from "../../db/activeRecords";
import { ensureDefaultVaultUser } from "../../db/vaultUsers";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { calculateReconstitution } from "../calculator/calculatorUtils";
import type { Peptide, DoseUnit } from "../../types/peptide";
import type { DoseScheduleDurationType, DoseSchedulePhase, PeptideSchedule } from "../../types/schedule";
import type { InjectionLog } from "../../types/injectionLog";
import {
  addDays,
  getLocalDateString,
  getScheduledDoseForDate,
  getUpcomingInjectionDates,
  isCompletedScheduledInjectionLog,
  parseLocalDate,
} from "../../utils/dateUtils";
import { getLegacyScheduleFirstDoseDate } from "../../utils/scheduleMigration";
import { getPreferredSchedule } from "../../utils/scheduleUtils";
import { isAvailableStock } from "../../utils/stockUtils";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import { PRELOADED_PEPTIDES } from "../../utils/peptideList";
import { DEFAULT_VAULT_USER_ID } from "../../types/vaultUser";

type ScheduleType = "everyXDays" | "daysOfWeek";
type AnchorType = "startDate" | "lastInjectionDate";
type DosingMode = "scheduled" | "adHoc";
type DoseScheduleRow = {
  id: string;
  startDate: string;
  endDate: string;
  durationType: DoseScheduleDurationType;
  durationValue: string;
  intervalDays: string;
  daysOfWeek: number[];
  doseValue: string;
  doseUnit: DoseUnit;
};
type AddPeptideLocationState = {
  sourceStockItemId?: string;
  prefilledName?: string;
  peptideMg?: number;
  bacWaterMl?: number;
  desiredDoseValue?: number;
  desiredDoseUnit?: DoseUnit;
  syringeSizeMl?: number;
  unitsPerMl?: number;
  vaultUserId?: string;
  sourceOpenVialId?: string;
};
type PendingPastInjectionSave = {
  peptide: Peptide;
  schedule: PeptideSchedule;
  pastDates: string[];
  nowIso: string;
};

const MAX_DOSE_SCHEDULE_PHASES = 15;

const isDoseUnit = (value: unknown): value is DoseUnit => value === "mcg" || value === "mg";
const isAnchorType = (value: string): value is AnchorType =>
  value === "startDate" || value === "lastInjectionDate";
const isDoseScheduleDurationType = (value: string): value is DoseScheduleDurationType =>
  value === "injections" || value === "weeks" || value === "daysOfWeek";
const makeDoseScheduleRow = (doseUnit: DoseUnit = "mg", doseValue = ""): DoseScheduleRow => ({
  id: crypto.randomUUID(),
  startDate: "",
  endDate: "",
  durationType: "injections",
  durationValue: "",
  intervalDays: "3",
  daysOfWeek: [],
  doseValue,
  doseUnit,
});

const getDefaultDoseScheduleRows = (doseUnit: DoseUnit, doseValue: string): DoseScheduleRow[] => [
  makeDoseScheduleRow(doseUnit, doseValue),
];

const phaseToRow = (phase: DoseSchedulePhase): DoseScheduleRow => ({
  id: phase.id,
  startDate: phase.startDate || "",
  endDate: phase.endDate || "",
  durationType: phase.durationType,
  durationValue: phase.durationValue ? String(phase.durationValue) : "",
  intervalDays: phase.intervalDays ? String(phase.intervalDays) : "3",
  daysOfWeek: phase.daysOfWeek || [],
  doseValue: String(phase.doseValue),
  doseUnit: phase.doseUnit,
});
const legacyScheduleToRow = (schedule: PeptideSchedule, doseUnit: DoseUnit, doseValue: number): DoseScheduleRow => ({
  id: crypto.randomUUID(),
  startDate: "",
  endDate: "",
  durationType: schedule.scheduleType === "daysOfWeek" ? "daysOfWeek" : "injections",
  durationValue: "",
  intervalDays: String(schedule.intervalDays || 3),
  daysOfWeek: schedule.daysOfWeek || [],
  doseValue: String(doseValue),
  doseUnit,
});
const getDrawForDose = (
  doseValue: number,
  doseUnit: DoseUnit,
  concentrationMcgPerMl: number,
  unitsPerMl: number
) => {
  const doseMcg = doseUnit === "mg" ? doseValue * 1000 : doseValue;
  const drawMl = concentrationMcgPerMl > 0 ? doseMcg / concentrationMcgPerMl : 0;
  return {
    drawMl,
    drawUnits: drawMl * unitsPerMl,
  };
};
const getStandardSyringeOption = (size: number) => {
  if (size === 0.3) return "0.3";
  if (size === 0.5) return "0.5";
  if (size === 1) return "1.0";
  if (size === 3) return "3.0";
  return null;
};
type AddSourceType = "manual" | "stock" | "openVial";

const getOpenContainerById = (options: Peptide[] | undefined, openVialId: string) =>
  options?.find((peptide) => (peptide.openVialId || peptide.id) === openVialId && peptide.isContainerOnly) ||
  options?.find((peptide) => (peptide.openVialId || peptide.id) === openVialId);

export const AddPeptidePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = !!id;
  const today = getLocalDateString();

  // Retrieve existing peptide and schedule if in Edit Mode
  const existingData = useLiveQuery(async () => {
    if (!id) return null;
    const peptide = await db.peptides.get(id);
    if (!peptide || !isActiveRecord(peptide)) return null;
    const peptideSchedules = activeRecords(await db.schedules.where("peptideId").equals(id).toArray());
    const schedule = getPreferredSchedule(peptideSchedules, id);
    const logsList = activeRecords(await db.injectionLogs.where("peptideId").equals(id).toArray());
    return { peptide, schedule, logsList };
  }, [id]);
  const settingsList = useLiveQuery(() => db.appSettings.toArray());
  const vaultUsers = useLiveQuery(async () => activeRecords(await db.vaultUsers.orderBy("sortOrder").toArray()));
  const openVialOptions = useLiveQuery(async () => activeRecords(await db.peptides.toArray()));

  // Form states
  const [name, setName] = useState("");
  const [vialMg, setVialMg] = useState("5");
  const [bacWaterMl, setBacWaterMl] = useState("2");
  const [oilVolumeMl, setOilVolumeMl] = useState("1");
  const [desiredDoseValue, setDesiredDoseValue] = useState("0.25");
  const [desiredDoseUnit, setDesiredDoseUnit] = useState<DoseUnit>("mg");
  const [syringeSize, setSyringeSize] = useState("1.0");
  const [customSyringeSize, setCustomSyringeSize] = useState("");
  const [unitsPerMl, setUnitsPerMl] = useState("100");
  const [notes, setNotes] = useState("");
  const [vaultUserId, setVaultUserId] = useState(DEFAULT_VAULT_USER_ID);
  const [sourceType, setSourceType] = useState<AddSourceType>("manual");
  const [sourceOpenVialId, setSourceOpenVialId] = useState("");
  const [dosingMode, setDosingMode] = useState<DosingMode>("scheduled");
  const isOilBased = name.trim().toLowerCase().startsWith("testosterone");

  // Schedule states
  const [doseScheduleRows, setDoseScheduleRows] = useState<DoseScheduleRow[]>(() =>
    getDefaultDoseScheduleRows("mg", "0.25")
  );
  const [injectionTime, setInjectionTime] = useState("09:00");
  const [anchorType, setAnchorType] = useState<AnchorType>("startDate");
  const [anchorDate, setAnchorDate] = useState(getLocalDateString());
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [cycleWeeksOn, setCycleWeeksOn] = useState("8");
  const [cycleWeeksOff, setCycleWeeksOff] = useState("4");
  const [pendingPastInjectionSave, setPendingPastInjectionSave] =
    useState<PendingPastInjectionSave | null>(null);
  const addPeptideLocationState = location.state as AddPeptideLocationState | null;

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  useEffect(() => {
    if (isEditMode) return;
    const requestedUserId = addPeptideLocationState?.vaultUserId;
    if (requestedUserId) {
      queueMicrotask(() => setVaultUserId(requestedUserId));
    }
  }, [addPeptideLocationState?.vaultUserId, isEditMode]);

  useEffect(() => {
    if (isEditMode || addPeptideLocationState || !settingsList) return;

    queueMicrotask(() => {
      settingsList.forEach((item) => {
        if (item.key === "pref_syringeSize" && typeof item.value === "string") {
          setSyringeSize(item.value);
        }
        if (item.key === "pref_dosingUnit" && isDoseUnit(item.value)) {
          const doseUnit = item.value;
          setDesiredDoseUnit(doseUnit);
          setDoseScheduleRows((rows) =>
            rows.length === 1 ? rows.map((row) => ({ ...row, doseUnit })) : rows
          );
        }
      });
    });
  }, [addPeptideLocationState, isEditMode, settingsList]);

  // Set initial state from state navigation (reconstitution calculator prefill)
  useEffect(() => {
    if (!addPeptideLocationState || isEditMode) return;

    queueMicrotask(() => {
      setSourceType(addPeptideLocationState.sourceStockItemId ? "stock" : addPeptideLocationState.sourceOpenVialId ? "openVial" : "manual");
      if (addPeptideLocationState.sourceOpenVialId) setSourceOpenVialId(addPeptideLocationState.sourceOpenVialId);
      if (addPeptideLocationState.prefilledName) setName(addPeptideLocationState.prefilledName);
      if (addPeptideLocationState.peptideMg) setVialMg(String(addPeptideLocationState.peptideMg));
      if (addPeptideLocationState.bacWaterMl) setBacWaterMl(String(addPeptideLocationState.bacWaterMl));
      if (addPeptideLocationState.desiredDoseValue) {
        setDesiredDoseValue(String(addPeptideLocationState.desiredDoseValue));
        setDoseScheduleRows((rows) =>
          rows.length === 1
            ? rows.map((row) => ({ ...row, doseValue: String(addPeptideLocationState.desiredDoseValue) }))
            : rows
        );
      }
      if (isDoseUnit(addPeptideLocationState.desiredDoseUnit)) {
        setDesiredDoseUnit(addPeptideLocationState.desiredDoseUnit);
        setDoseScheduleRows((rows) =>
          rows.length === 1 ? rows.map((row) => ({ ...row, doseUnit: addPeptideLocationState.desiredDoseUnit! })) : rows
        );
      }
      if (addPeptideLocationState.unitsPerMl) setUnitsPerMl(String(addPeptideLocationState.unitsPerMl));

      const size = addPeptideLocationState.syringeSizeMl;
      const standardSize = typeof size === "number" ? getStandardSyringeOption(size) : null;
      if (standardSize) {
        setSyringeSize(standardSize);
      } else if (size) {
        setSyringeSize("custom");
        setCustomSyringeSize(String(size));
      }
    });
  }, [addPeptideLocationState, isEditMode]);

  useEffect(() => {
    if (isEditMode || sourceType !== "openVial" || !sourceOpenVialId || !openVialOptions) return;
    const source = getOpenContainerById(openVialOptions, sourceOpenVialId);
    if (!source) return;

    queueMicrotask(() => {
      setName(source.name);
      setVialMg(String(source.vialMg));
      setBacWaterMl(String(source.bacWaterMl));
      setOilVolumeMl(String(source.oilVolumeMl ?? source.bacWaterMl));
      setSyringeSize(getStandardSyringeOption(source.syringeSizeMl) || "custom");
      if (!getStandardSyringeOption(source.syringeSizeMl)) setCustomSyringeSize(String(source.syringeSizeMl));
      setUnitsPerMl(String(source.unitsPerMl));
      setDesiredDoseUnit(source.desiredDoseUnit);
      setDoseScheduleRows((rows) =>
        rows.length === 1 ? rows.map((row) => ({ ...row, doseUnit: source.desiredDoseUnit })) : rows
      );
    });
  }, [isEditMode, openVialOptions, sourceOpenVialId, sourceType]);

  // Set initial state from loaded data in Edit Mode
  useEffect(() => {
    if (existingData?.peptide) {
      const p = existingData.peptide;
      const s = existingData.schedule;

      queueMicrotask(() => {
        setName(p.name);
        setVaultUserId(p.vaultUserId || DEFAULT_VAULT_USER_ID);
        setVialMg(String(p.vialMg));
        setBacWaterMl(String(p.bacWaterMl));
        setOilVolumeMl(String(p.oilVolumeMl ?? p.bacWaterMl));
        setDesiredDoseValue(String(p.desiredDoseValue));
        setDesiredDoseUnit(p.desiredDoseUnit);
        setDosingMode(s?.isActive === false ? "adHoc" : "scheduled");
        setDoseScheduleRows(
          s?.doseSchedule?.length
            ? s.doseSchedule.map(phaseToRow)
            : s
            ? [legacyScheduleToRow(s, p.desiredDoseUnit, p.desiredDoseValue)]
            : getDefaultDoseScheduleRows(p.desiredDoseUnit, String(p.desiredDoseValue))
        );
        setUnitsPerMl(String(p.unitsPerMl));
        setNotes(p.notes || "");

        const size = p.syringeSizeMl;
        const standardSize = getStandardSyringeOption(size);
        if (standardSize) {
          setSyringeSize(standardSize);
        } else {
          setSyringeSize("custom");
          setCustomSyringeSize(String(size));
        }

        if (s) {
          setInjectionTime(s.injectionTime || "09:00");
          setCycleEnabled(Boolean(s.cycleEnabled));
          setCycleWeeksOn(String(s.cycleWeeksOn || 8));
          setCycleWeeksOff(String(s.cycleWeeksOff || 4));

          if (s.doseScheduleStartDate) {
            setAnchorType("startDate");
            setAnchorDate(s.doseScheduleStartDate);
          } else if (s.lastInjectionDate) {
            setAnchorType("lastInjectionDate");
            setAnchorDate(s.lastInjectionDate);
          } else if (s.startDate) {
            setAnchorType("startDate");
            setAnchorDate(s.startDate);
          }
        }
      });
    }
  }, [existingData]);

  const handleDesiredDoseValueChange = (value: string) => {
    setDesiredDoseValue(value);
    setDoseScheduleRows((rows) =>
      rows.length === 1 ? rows.map((row) => ({ ...row, doseValue: value })) : rows
    );
  };

  const handleDesiredDoseUnitChange = (value: DoseUnit) => {
    setDesiredDoseUnit(value);
    setDoseScheduleRows((rows) =>
      rows.length === 1 ? rows.map((row) => ({ ...row, doseUnit: value })) : rows
    );
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
    setDoseScheduleRows((rows) =>
      rows.length >= MAX_DOSE_SCHEDULE_PHASES
        ? rows
        : [...rows, makeDoseScheduleRow(desiredDoseUnit, desiredDoseValue)]
    );
  };

  const handleRemoveDoseScheduleRow = (rowId: string) => {
    setDoseScheduleRows((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((row) => row.id !== rowId);
    });
  };

  const toggleDoseScheduleDay = (rowId: string, day: number) => {
    setDoseScheduleRows((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              daysOfWeek: row.daysOfWeek.includes(day)
                ? row.daysOfWeek.filter((value) => value !== day)
                : [...row.daysOfWeek, day].sort(),
            }
          : row
      )
    );
  };

  const getFriendlyDate = (dateStr: string) => {
    try {
      return parseLocalDate(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const persistPeptideSchedule = async (
    peptide: Peptide,
    schedule: PeptideSchedule,
    pastDates: string[],
    nowIso: string
  ) => {
    await db.transaction("rw", [db.peptides, db.schedules, db.injectionLogs, db.stockItems], async () => {
      await db.peptides.put(peptide);
      await db.schedules.put(schedule);

      for (const scheduledDate of pastDates) {
        const scheduledDose = getScheduledDoseForDate(peptide, schedule, scheduledDate);
        const scheduledDraw = getDrawForDose(
          scheduledDose.doseValue,
          scheduledDose.doseUnit,
          peptide.concentrationMcgPerMl,
          peptide.unitsPerMl
        );
        const log: InjectionLog = {
          id: crypto.randomUUID(),
          peptideId: peptide.id,
          vaultUserId: peptide.vaultUserId,
          openVialId: peptide.openVialId,
          peptideNameSnapshot: peptide.name,
          scheduledDate,
          actualDateTime: new Date(`${scheduledDate}T12:00`).toISOString(),
          doseValue: scheduledDose.doseValue,
          doseUnit: scheduledDose.doseUnit,
          drawMl: scheduledDraw.drawMl,
          drawUnits: scheduledDraw.drawUnits,
          status: "taken",
          notes: "Auto-logged from verified past dosing schedule.",
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await db.injectionLogs.put(log);
      }

      if (!isEditMode && sourceType === "stock" && addPeptideLocationState?.sourceStockItemId) {
        const stockItem = await db.stockItems.get(addPeptideLocationState.sourceStockItemId);
        const vialCount = stockItem?.numberOfVials ? parseInt(stockItem.numberOfVials, 10) : NaN;

        if (!stockItem || !isAvailableStock(stockItem, today)) {
          throw new Error("Selected stock item is not available to open yet.");
        }

        if (stockItem && !isNaN(vialCount) && vialCount > 0) {
          await db.stockItems.update(stockItem.id, {
            numberOfVials: String(Math.max(0, vialCount - 1)),
            updatedAt: nowIso,
          });
        }
      }
    });

    navigate(isEditMode ? `/vault/${peptide.id}` : "/vault");
  };

  const persistPeptideScheduleWithMessage = async (
    peptide: Peptide,
    schedule: PeptideSchedule,
    pastDates: string[],
    nowIso: string
  ) => {
    try {
      await persistPeptideSchedule(peptide, schedule, pastDates, nowIso);
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save this peptide.");
      return false;
    }
  };

  const handleConfirmPastInjections = async () => {
    if (!pendingPastInjectionSave) return;
    const saved = await persistPeptideScheduleWithMessage(
      pendingPastInjectionSave.peptide,
      pendingPastInjectionSave.schedule,
      pendingPastInjectionSave.pastDates,
      pendingPastInjectionSave.nowIso
    );
    if (!saved) return;
    setPendingPastInjectionSave(null);
  };

  const handleDenyPastInjections = async () => {
    if (!pendingPastInjectionSave) return;
    const saved = await persistPeptideScheduleWithMessage(
      pendingPastInjectionSave.peptide,
      pendingPastInjectionSave.schedule,
      [],
      pendingPastInjectionSave.nowIso
    );
    if (!saved) return;
    setPendingPastInjectionSave(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      alert("Peptide name is required.");
      return;
    }

    const mg = parseFloat(vialMg);
    const water = parseFloat(isOilBased ? oilVolumeMl : bacWaterMl);
    const dose = parseFloat(desiredDoseValue);
    const upm = parseFloat(unitsPerMl);
    const size = syringeSize === "custom" ? parseFloat(customSyringeSize) : parseFloat(syringeSize);

    if (
      isNaN(mg) ||
      mg <= 0 ||
      isNaN(water) ||
      water <= 0 ||
      isNaN(dose) ||
      dose <= 0 ||
      isNaN(upm) ||
      upm <= 0 ||
      isNaN(size) ||
      size <= 0
    ) {
      alert(isOilBased ? "Please enter valid positive vial, volume, and dose values." : "Please enter valid positive values for all reconstitution settings.");
      return;
    }

    if (dosingMode === "scheduled" && !anchorDate) {
      alert("Please enter a valid start or last injection date.");
      return;
    }
    const parsedCycleWeeksOn = parseInt(cycleWeeksOn, 10);
    const parsedCycleWeeksOff = parseInt(cycleWeeksOff, 10);
    if (
      dosingMode === "scheduled" &&
      cycleEnabled &&
      (isNaN(parsedCycleWeeksOn) ||
        parsedCycleWeeksOn <= 0 ||
        isNaN(parsedCycleWeeksOff) ||
        parsedCycleWeeksOff <= 0)
    ) {
      alert("Cycle settings need valid on and off week counts.");
      return;
    }
    if (!isEditMode && sourceType === "openVial" && !sourceOpenVialId) {
      alert("Please choose the open container this peptide should use.");
      return;
    }
    const selectedContainerForUser =
      sourceType === "openVial" ? getOpenContainerById(openVialOptions, sourceOpenVialId) : undefined;
    if (
      selectedContainerForUser?.containerType === "pen" &&
      selectedContainerForUser.sharedWithUserIds?.length &&
      !selectedContainerForUser.sharedWithUserIds.includes(vaultUserId)
    ) {
      alert("This pen has not been shared with the selected user.");
      return;
    }

    const phases: DoseSchedulePhase[] = [];
    for (const [index, row] of dosingMode === "scheduled" ? doseScheduleRows.entries() : []) {
      const isLast = index === doseScheduleRows.length - 1;
      const hasNextPhaseStartDate = Boolean(doseScheduleRows[index + 1]?.startDate);
      const requiresDuration = !isLast && !hasNextPhaseStartDate;
      const phaseDose = parseFloat(row.doseValue);
      const phaseInterval = parseInt(row.intervalDays, 10);
      const phaseDuration = parseInt(row.durationValue, 10);

      if (isLast && row.endDate && row.endDate < anchorDate) {
        alert("The schedule end date cannot be before the first dose date.");
        return;
      }

      if (isNaN(phaseDose) || phaseDose <= 0) {
        alert("Each dosing schedule line needs a valid dose.");
        return;
      }
      if (row.durationType === "injections" && (isNaN(phaseInterval) || phaseInterval <= 0)) {
        alert("Each Every X Days schedule line needs a valid day interval.");
        return;
      }
      if (row.durationType === "daysOfWeek" && row.daysOfWeek.length === 0) {
        alert("Each Days of Week schedule line needs at least one selected day.");
        return;
      }
      if (requiresDuration && (isNaN(phaseDuration) || phaseDuration <= 0)) {
        alert("Each dosing schedule line before the last needs a valid duration unless the next phase has a start date.");
        return;
      }
      if (index > 0 && row.startDate && row.startDate < anchorDate) {
        alert("A phase start date cannot be before the first dose date.");
        return;
      }

      phases.push({
        id: row.id,
        startDate: index > 0 && row.startDate ? row.startDate : undefined,
        endDate: isLast && row.endDate ? row.endDate : undefined,
        durationType: row.durationType,
        durationValue: requiresDuration ? phaseDuration : undefined,
        intervalDays: row.durationType === "injections" ? phaseInterval : undefined,
        daysOfWeek: row.durationType === "daysOfWeek" ? row.daysOfWeek : undefined,
        doseValue: phaseDose,
        doseUnit: row.doseUnit,
        isContinuous: isLast && !row.endDate,
      });
    }

    const firstPhase = phases[0];
    const parsedInterval = firstPhase?.durationType === "injections" ? firstPhase.intervalDays || 1 : 7;
    const firstPhaseDaysOfWeek = firstPhase?.durationType === "daysOfWeek" ? firstPhase.daysOfWeek || [] : [];
    const primaryScheduleType: ScheduleType = firstPhase?.durationType === "daysOfWeek" ? "daysOfWeek" : "everyXDays";
    // Perform calculation
    const calc = calculateReconstitution({ peptideMg: mg, bacWaterMl: water, desiredDoseValue: dose, desiredDoseUnit, unitsPerMl: upm });

    const peptideId = isEditMode ? id! : crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const selectedSourceOpenVial =
      sourceType === "openVial" && openVialOptions
        ? getOpenContainerById(openVialOptions, sourceOpenVialId)
        : undefined;
    const openVialId = isEditMode
      ? existingData?.peptide?.openVialId || peptideId
      : selectedSourceOpenVial?.openVialId || selectedSourceOpenVial?.id || peptideId;

    const newPeptide: Peptide = {
      id: peptideId,
      name: nameTrimmed,
      vialMg: mg,
      bacWaterMl: water,
      desiredDoseValue: dose,
      desiredDoseUnit: desiredDoseUnit,
      syringeSizeMl: size,
      unitsPerMl: upm,
      concentrationMgPerMl: calc.concentrationMgPerMl,
      concentrationMcgPerMl: calc.concentrationMcgPerMl,
      doseMl: calc.doseMl,
      doseUnits: calc.doseUnits,
      estimatedDosesPerVial: calc.estimatedDosesPerVial,
      percentOfVialPerDose: calc.percentOfVialPerDose,
      isOilBased,
      oilVolumeMl: isOilBased ? water : undefined,
      notes: notes.trim() || undefined,
      sourceStockItemId:
        sourceType === "stock"
          ? addPeptideLocationState?.sourceStockItemId
          : selectedSourceOpenVial?.sourceStockItemId || existingData?.peptide?.sourceStockItemId,
      sourceOpenVialId: selectedSourceOpenVial ? openVialId : existingData?.peptide?.sourceOpenVialId,
      vaultUserId,
      openVialId,
      containerType: selectedSourceOpenVial?.containerType,
      currentVialStartedAt: isEditMode
        ? existingData?.peptide?.currentVialStartedAt
        : selectedSourceOpenVial?.currentVialStartedAt || selectedSourceOpenVial?.createdAt || nowIso,
      currentVialTotalMg: isEditMode
        ? existingData?.peptide?.currentVialTotalMg
        : selectedSourceOpenVial?.currentVialTotalMg,
      createdAt: existingData?.peptide?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const newSchedule: PeptideSchedule = {
      id: existingData?.schedule?.id || crypto.randomUUID(),
      peptideId: peptideId,
      vaultUserId,
      openVialId,
      scheduleType: primaryScheduleType,
      daysOfWeek: primaryScheduleType === "daysOfWeek" ? firstPhaseDaysOfWeek : undefined,
      intervalDays: primaryScheduleType === "everyXDays" ? parsedInterval : undefined,
      injectionTime: dosingMode === "scheduled" ? injectionTime : undefined,
      startDate: dosingMode === "scheduled" && anchorType === "startDate" ? anchorDate : undefined,
      lastInjectionDate: dosingMode === "scheduled" && anchorType === "lastInjectionDate" ? anchorDate : undefined,
      cycleEnabled: dosingMode === "scheduled" ? cycleEnabled : undefined,
      cycleWeeksOn: dosingMode === "scheduled" && cycleEnabled ? parsedCycleWeeksOn : undefined,
      cycleWeeksOff: dosingMode === "scheduled" && cycleEnabled ? parsedCycleWeeksOff : undefined,
      doseScheduleStartDate: dosingMode === "scheduled" ? existingData?.schedule?.doseScheduleStartDate : undefined,
      doseSchedule: dosingMode === "scheduled" ? phases : undefined,
      isActive: dosingMode === "scheduled",
      createdAt: existingData?.schedule?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const doseScheduleStartDate =
      anchorType === "lastInjectionDate"
        ? getLegacyScheduleFirstDoseDate(newSchedule) || anchorDate
        : anchorDate;

    if (dosingMode === "scheduled") newSchedule.doseScheduleStartDate = doseScheduleStartDate;

    const existingLogDates = new Set(
      (existingData?.logsList || [])
        .filter(isCompletedScheduledInjectionLog)
        .map((log) => log.scheduledDate)
    );
    const pastDates =
      dosingMode === "scheduled" && doseScheduleStartDate < today
        ? getUpcomingInjectionDates(newSchedule, doseScheduleStartDate, addDays(today, -1)).filter(
            (date) => !existingLogDates.has(date)
          )
        : [];

    if (pastDates.length > 0) {
      setPendingPastInjectionSave({
        peptide: newPeptide,
        schedule: newSchedule,
        pastDates,
        nowIso,
      });
      return;
    }

    await persistPeptideScheduleWithMessage(newPeptide, newSchedule, [], nowIso);
  };

  const weekdays = [
    { label: "S", value: 0 },
    { label: "M", value: 1 },
    { label: "T", value: 2 },
    { label: "W", value: 3 },
    { label: "T", value: 4 },
    { label: "F", value: 5 },
    { label: "S", value: 6 },
  ];

  return (
    <div className="fade-in">
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "4px",
          }}
        >
          <ChevronLeft size={24} />
        </button>
          <h1 style={{ fontSize: "1.4rem" }}>
          {isEditMode ? "Edit Peptide" : "Add Peptide"}
        </h1>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Card>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>Vault User</h3>
          <Select
            label="User"
            value={vaultUserId}
            onChange={(e) => setVaultUserId(e.target.value)}
            options={(vaultUsers || []).map((user) => ({ value: user.id, label: user.displayName }))}
          />

          {!isEditMode && (
            <Select
              label="Source"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as AddSourceType)}
              options={[
                { value: addPeptideLocationState?.sourceStockItemId ? "stock" : "manual", label: addPeptideLocationState?.sourceStockItemId ? "From Stock" : "New Vial" },
                { value: "openVial", label: "Existing Open Container" },
              ]}
            />
          )}

          {!isEditMode && sourceType === "openVial" && (
            <Select
              label="Open Container"
              value={sourceOpenVialId}
              onChange={(e) => setSourceOpenVialId(e.target.value)}
              options={[
                { value: "", label: "Choose open container" },
                ...Array.from(
                  new Map(
                    (openVialOptions || []).filter((peptide) => {
                      if (!peptide.isContainerOnly) return true;
                      return peptide.containerType !== "pen" || !peptide.sharedWithUserIds?.length || peptide.sharedWithUserIds.includes(vaultUserId);
                    }).map((peptide) => [
                      peptide.openVialId || peptide.id,
                      {
                        value: peptide.openVialId || peptide.id,
                        label: `${peptide.containerLabel || peptide.name} (${peptide.containerType === "pen" ? "pen" : "vial"} · ${peptide.vialMg} mg)`,
                      },
                    ])
                  ).values()
                ),
              ]}
            />
          )}

          <Select
            label="Dosing"
            value={dosingMode}
            onChange={(e) => setDosingMode(e.target.value === "adHoc" ? "adHoc" : "scheduled")}
            options={[
              { value: "scheduled", label: "Scheduled dosing" },
              { value: "adHoc", label: "Ad-hoc only (no schedule)" },
            ]}
          />
          {dosingMode === "adHoc" && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.4, marginTop: "10px" }}>
              This opens the vial without adding it to a dosing schedule. Log each injection manually from the Vault.
            </p>
          )}
        </Card>
        
        {/* Core Settings */}
        <Card>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>Core Details</h3>
          <Input
            label="Peptide Name"
            type="text"
            required
            placeholder="e.g. BPC-157, Semaglutide"
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="preloaded-peptides-list"
          />
          <datalist id="preloaded-peptides-list">
            {PRELOADED_PEPTIDES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <div className="form-row-grid">
            <Input
              label="Vial Size"
              type="number"
              inputMode="decimal"
              value={vialMg}
              onChange={(e) => setVialMg(e.target.value)}
              suffix="mg"
              min="0.01"
              step="any"
              required
            />
            <Input
              label={isOilBased ? "Vial Volume" : "BAC Water"}
              type="number"
              inputMode="decimal"
              value={isOilBased ? oilVolumeMl : bacWaterMl}
              onChange={(e) => isOilBased ? setOilVolumeMl(e.target.value) : setBacWaterMl(e.target.value)}
              suffix="mL"
              min="0.01"
              step="any"
              required
            />
          </div>

          {isOilBased && <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.4, marginTop: "-4px" }}>Oil-based product — enter the prefilled vial volume to calculate concentration and draw; no bacteriostatic water is used.</p>}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <Input
              label="Desired Dose"
              type="number"
              inputMode="decimal"
              value={desiredDoseValue}
              onChange={(e) => handleDesiredDoseValueChange(e.target.value)}
              min="0.01"
              step="any"
              required
            />
            <Select
              label="Unit"
              value={desiredDoseUnit}
              onChange={(e) => {
                if (isDoseUnit(e.target.value)) handleDesiredDoseUnitChange(e.target.value);
              }}
              options={[
                { value: "mcg", label: "mcg" },
                { value: "mg", label: "mg" },
              ]}
            />
          </div>

          <div className="form-row-grid">
            <Select
              label="Injection Device"
              value={syringeSize}
              onChange={(e) => setSyringeSize(e.target.value)}
              options={[
                { value: "0.3", label: "0.3 mL" },
                { value: "0.5", label: "0.5 mL" },
                { value: "1.0", label: "1.0 mL" },
                { value: "3.0", label: "3 mL Pen" },
                { value: "custom", label: "Custom" },
              ]}
            />
            {syringeSize === "custom" ? (
              <Input
                label="Custom Size"
                type="number"
                inputMode="decimal"
                value={customSyringeSize}
                onChange={(e) => setCustomSyringeSize(e.target.value)}
                suffix="mL"
                min="0.01"
                step="any"
                required
              />
            ) : (
              <Input
                label="Units per mL"
                type="number"
                inputMode="numeric"
                value={unitsPerMl}
                onChange={(e) => setUnitsPerMl(e.target.value)}
                min="1"
                required
              />
            )}
          </div>
        </Card>

        {/* Schedule Settings */}
        {dosingMode === "scheduled" && <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>Dosing Schedule</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.4 }}>
                Add one or more dose phases. The last line continues until you change it.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDoseScheduleRow}
              aria-label="Add dosing phase"
              title="Add dosing phase"
              disabled={doseScheduleRows.length >= MAX_DOSE_SCHEDULE_PHASES}
              style={{
                flexShrink: 0,
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                border: "1px solid var(--color-primary)",
                background: "var(--bg-active-soft)",
                color: "var(--color-primary)",
                opacity: doseScheduleRows.length >= MAX_DOSE_SCHEDULE_PHASES ? 0.45 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: doseScheduleRows.length >= MAX_DOSE_SCHEDULE_PHASES ? "not-allowed" : "pointer",
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            {doseScheduleRows.map((row, index) => {
              const isLast = index === doseScheduleRows.length - 1;
              const isEndedByNextPhaseStart = !isLast && Boolean(doseScheduleRows[index + 1]?.startDate);
              const showDaysOfWeek = row.durationType === "daysOfWeek";
              const canRemovePhase = doseScheduleRows.length > 1;
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
                    background: isLast ? "rgba(16, 185, 129, 0.06)" : "var(--bg-input)",
                  }}
                >
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gridTemplateColumns: canRemovePhase ? "minmax(0, 1fr) 42px" : "1fr",
                      gap: "8px",
                      alignItems: "end",
                    }}
                  >
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
                        { value: "daysOfWeek", label: "Days of Week" },
                      ]}
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

                  <Input
                    label="Phase Start"
                    type="date"
                    value={index === 0 ? anchorDate : row.startDate}
                    onChange={(e) => {
                      if (index === 0) {
                        setAnchorType("startDate");
                        setAnchorDate(e.target.value);
                      } else {
                        updateDoseScheduleRow(row.id, { startDate: e.target.value });
                      }
                    }}
                    required={index === 0}
                  />

                  {isLast && (
                    <Input
                      label="End Date"
                      type="date"
                      value={row.endDate}
                      onChange={(e) => updateDoseScheduleRow(row.id, { endDate: e.target.value })}
                      min={anchorDate}
                    />
                  )}

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
                          placeholder={isEndedByNextPhaseStart ? "Ends at next phase" : "e.g. 4"}
                          disabled={isEndedByNextPhaseStart}
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
                          placeholder={isEndedByNextPhaseStart ? "Ends at next phase" : "e.g. 8"}
                          suffix="doses"
                          disabled={isEndedByNextPhaseStart}
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
                      placeholder={isLast ? "Continuous" : isEndedByNextPhaseStart ? "Ends at next phase" : "e.g. 4"}
                      disabled={isLast || isEndedByNextPhaseStart}
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
                      {row.endDate ? `Ends ${row.endDate}` : "Continuous phase"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="form-row-grid">
            <Select
              label="Anchor Type"
              value={anchorType}
              onChange={(e) => {
                if (isAnchorType(e.target.value)) setAnchorType(e.target.value);
              }}
              options={[
                { value: "startDate", label: "First Dose Date" },
                { value: "lastInjectionDate", label: "Last Dose Date" },
              ]}
            />
            <Input
              label={anchorType === "lastInjectionDate" ? "Last Dose Date" : "First Dose Date"}
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              required
            />
          </div>

          <Input
            id="injection-time"
            label="Dose Time"
            type="time"
            value={injectionTime}
            onInput={(e) => setInjectionTime(e.currentTarget.value || "09:00")}
            onChange={(e) => setInjectionTime(e.target.value || "09:00")}
            required
          />

          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-input)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={cycleEnabled}
                onChange={(e) => setCycleEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
              />
              Cycle dosing
            </label>
            {cycleEnabled && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="form-row-grid">
                  <Input
                    label="On"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={cycleWeeksOn}
                    onChange={(e) => setCycleWeeksOn(e.target.value)}
                    suffix="weeks"
                  />
                  <Input
                    label="Off"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={cycleWeeksOff}
                    onChange={(e) => setCycleWeeksOff(e.target.value)}
                    suffix="weeks"
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {[
                    { label: "8 on / 4 off", on: "8", off: "4" },
                    { label: "4 on / 2 off", on: "4", off: "2" },
                    { label: "12 on / 4 off", on: "12", off: "4" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCycleWeeksOn(preset.on);
                        setCycleWeeksOff(preset.off);
                      }}
                      style={{
                        border: "1px solid var(--border-color)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        borderRadius: "999px",
                        padding: "7px 10px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </Card>}

        {/* Notes */}
        <Card>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>Notes</h3>
          <div className="form-group">
            <label htmlFor="peptide-notes" className="form-label">
              Optional Notes
            </label>
            <textarea
              id="peptide-notes"
              className="form-control"
              style={{ minHeight: "80px", resize: "vertical" }}
              placeholder="e.g. Keep refrigerated, store in dark drawer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        <Button type="submit" variant="primary" fullWidth style={{ marginBottom: "20px" }}>
          <Save size={18} />
          {isEditMode ? "Save Changes" : "Save Peptide"}
        </Button>
      </form>

      {pendingPastInjectionSave && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Confirm Past Injections</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              This dosing schedule starts in the past and has{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {pendingPastInjectionSave.pastDates.length}
              </strong>{" "}
              past injection{pendingPastInjectionSave.pastDates.length === 1 ? "" : "s"} without a log.
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginTop: "8px" }}>
              First missing injection: {getFriendlyDate(pendingPastInjectionSave.pastDates[0])}
              <br />
              Last missing injection:{" "}
              {getFriendlyDate(pendingPastInjectionSave.pastDates[pendingPastInjectionSave.pastDates.length - 1])}
            </p>
            <p style={{ color: "var(--text-primary)", fontSize: "0.92rem", fontWeight: 700, marginTop: "14px" }}>
              Were all of those past injections taken?
            </p>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <Button type="button" variant="secondary" fullWidth onClick={handleDenyPastInjections}>
                No
              </Button>
              <Button type="button" variant="primary" fullWidth onClick={handleConfirmPastInjections}>
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
