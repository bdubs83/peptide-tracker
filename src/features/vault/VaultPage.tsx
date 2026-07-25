import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { activeRecords } from "../../db/activeRecords";
import { putAppSetting } from "../../db/appSettings";
import { createVaultUser, ensureDefaultVaultUser, renameVaultUser } from "../../db/vaultUsers";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { useEffectiveLayoutMode } from "../../app/LayoutModeContext";
import { SyringeVisualizer } from "../../components/SyringeVisualizer";
import {
  getNextScheduledDoseDate,
  getDaysUntilNextScheduledDose,
  getSharedOpenVialProjection,
  getLocalDateString,
  addDays,
  parseLocalDate,
  getScheduledDoseForDate,
  getCurrentVialLogs,
  getCurrentVialTotalMcg,
  getCurrentVialAdjustedMcg,
  isCompletedScheduledInjectionLog,
} from "../../utils/dateUtils";
import { formatMl, formatUnits, formatDose, formatMgPerMl } from "../../utils/formatting";
import { normalizeDoseToMcg } from "../calculator/calculatorUtils";
import { PRELOADED_PEPTIDES } from "../../utils/peptideList";
import { makePreferredScheduleMap } from "../../utils/scheduleUtils";
import {
  groupStockItems,
  getStockProductKeyFromValues,
  getUniqueOpenVialTargets,
  isAvailableStock,
  isReceivedStock,
  sortStockLotsForUse,
} from "../../utils/stockUtils";
import { refillOpenVialFromStock } from "./refillFromStock";
import { RefillFromStockModal } from "./RefillFromStockModal";
import { logInjectionEvent } from "./vaultUtils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dna,
  Droplets,
  Edit2,
  FileText,
  Package,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { InjectionLog } from "../../types/injectionLog";
import type { DoseUnit, Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { StockItem } from "../../types/stock";
import type { VialAdjustment } from "../../types/vialAdjustment";
import type { BacWaterUsePurpose, BacWaterVial } from "../../types/bacWaterVial";
import type { BacWaterStockItem } from "../../types/bacWaterStock";
import { DEFAULT_VAULT_USER_ID } from "../../types/vaultUser";

const normalizePeptideName = (name: string) => name.trim().toLowerCase();
const vaultStockOpenKey = "pref_vault_stock_open";
const vaultBacWaterOpenKey = "pref_vault_bac_water_open";
const vaultOpenVialsOpenKey = "pref_vault_open_vials_open";
const BAC_EMPTY_THRESHOLD_ML = 0.0005;

type RefillRequest = {
  peptide: Peptide;
  stockOptions: StockItem[];
};

type PendingBackdatedAdHoc = {
  openedDate: string;
};

type VialStatus = {
  remainingMg: number;
  percent: number;
  remainingMcg: number;
};

type OpenContainerSummaryRow = {
  openVialId: string;
  peptide: Peptide;
  members: Peptide[];
  remainingMg: number;
  percent: number;
  daysRemaining: number | null;
  openedDate: string;
};

type StockProjection = {
  sourceName: string;
  injectionCount: number;
  emptyDate: string | null;
  daysUntilEmpty: number | null;
  scheduleLabel: string;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const maxCoaFileBytes = 500 * 1024;

const getCurrentTimeString = () => new Date().toTimeString().slice(0, 5);
const buildLocalDateTimeIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();

const hasLessThanTwoDosesRemaining = (remainingMcg: number, doseMcg: number) => {
  if (remainingMcg <= 0) return true;
  return doseMcg > 0 && remainingMcg < doseMcg * 2;
};

const VialFillGraphic: React.FC<{ percent: number; remainingMg: number }> = ({ percent, remainingMg }) => {
  const fillPercent = Math.min(100, Math.max(0, percent));
  const fillTop = 84 - fillPercent * 0.52;
  const fillHeight = fillPercent * 0.52;

  return (
    <svg viewBox="0 0 64 96" width="64" height="96" role="img" aria-label={`${fillPercent.toFixed(0)}% of vial remaining`}>
      <defs>
        <linearGradient id="vial-liquid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="17" y="4" width="30" height="12" rx="3" fill="#94a3b8" opacity="0.9" />
      <rect x="13" y="14" width="38" height="76" rx="9" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      {fillHeight > 0 && <path d={`M15 84 H49 V${fillTop + 7} Q32 ${fillTop - 1} 15 ${fillTop + 7} Z`} fill="url(#vial-liquid)" opacity="0.92" />}
      <path d="M18 25 H46 M18 43 H46 M18 61 H46" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text x="32" y="80" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">{remainingMg.toFixed(1)} mg</text>
    </svg>
  );
};

const PenFillGraphic: React.FC<{ percent: number; remainingMg: number }> = ({ percent, remainingMg }) => {
  const fillPercent = Math.min(100, Math.max(0, percent));
  const fillHeight = fillPercent * 0.44;
  const fillTop = 76 - fillHeight;

  return (
    <svg viewBox="0 0 64 96" width="64" height="96" role="img" aria-label={`${fillPercent.toFixed(0)}% of pen remaining`}>
      <defs>
        <linearGradient id="pen-liquid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path d="M23 5 H41 V16 H46 V77 L40 91 H24 L18 77 V16 H23 Z" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.56)" strokeWidth="2" strokeLinejoin="round" />
      <rect x="21" y="8" width="22" height="10" rx="3" fill="#94a3b8" />
      <path d="M18 77 H46 L40 88 H24 Z" fill="#94a3b8" opacity="0.78" />
      {fillHeight > 0 && <path d={`M20 76 H44 V${fillTop + 3} Q32 ${fillTop - 2} 20 ${fillTop + 3} Z`} fill="url(#pen-liquid)" opacity="0.94" />}
      <path d="M21 28 H43 M21 43 H43 M21 58 H43" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text x="32" y="70" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">{remainingMg.toFixed(1)} mg</text>
    </svg>
  );
};

const buildVialStatusByPeptideId = (
  peptides: Peptide[] = [],
  logs: InjectionLog[] = [],
  adjustments: VialAdjustment[] = []
) => {
  const map = new Map<string, VialStatus>();
  for (const peptide of peptides) {
    const takenMcg = getCurrentVialLogs(peptide, logs)
      .filter((log) => log.status === "taken" || log.status === "manual")
      .reduce((sum, log) => sum + normalizeDoseToMcg(log.doseValue, log.doseUnit), 0);
    const adjustedMcg = getCurrentVialAdjustedMcg(peptide, adjustments);

    const totalMcg = getCurrentVialTotalMcg(peptide);
    const remainingMcg = Math.max(0, totalMcg - takenMcg - adjustedMcg);
    const fullVialMcg = peptide.vialMg * 1000;
    map.set(peptide.id, {
      remainingMg: remainingMcg / 1000,
      percent: fullVialMcg > 0 ? (remainingMcg / fullVialMcg) * 100 : 0,
      remainingMcg,
    });
  }
  return map;
};

export const VaultPage: React.FC = () => {
  const navigate = useNavigate();
  const layoutMode = useEffectiveLayoutMode();
  const today = useMemo(() => getLocalDateString(), []);

  const peptides = useLiveQuery(async () => activeRecords(await db.peptides.toArray()));
  const schedules = useLiveQuery(async () => activeRecords(await db.schedules.toArray()));
  const logs = useLiveQuery(async () => activeRecords(await db.injectionLogs.toArray()));
  const vialAdjustments = useLiveQuery(async () => activeRecords(await db.vialAdjustments.toArray()));
  const stockItems = useLiveQuery(async () => activeRecords(await db.stockItems.orderBy("createdAt").reverse().toArray()));
  const bacWaterVials = useLiveQuery(async () => activeRecords(await db.bacWaterVials.orderBy("openedAt").reverse().toArray()));
  const bacWaterStockItems = useLiveQuery(async () => activeRecords(await db.bacWaterStockItems.orderBy("createdAt").reverse().toArray()));
  const vaultUsers = useLiveQuery(async () => activeRecords(await db.vaultUsers.orderBy("sortOrder").toArray()));
  const settings = useLiveQuery(() => db.appSettings.toArray());
  const syringeDisplayMode = settings?.find((item) => item.key === "pref_displayMode")?.value === "mL" ? "mL" : "units";
  const openBacWaterVials = useMemo(
    () => (bacWaterVials || []).filter((vial) => vial.remainingMl > BAC_EMPTY_THRESHOLD_ML),
    [bacWaterVials]
  );

  const [stockOpenOverride, setStockOpenOverride] = useState<boolean>();
  const [bacWaterOpenOverride, setBacWaterOpenOverride] = useState<boolean>();
  const [openVialsOpenOverride, setOpenVialsOpenOverride] = useState<boolean>();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingStockItemId, setEditingStockItemId] = useState<string | null>(null);
  const [stockName, setStockName] = useState("");
  const [stockMgPerVial, setStockMgPerVial] = useState("");
  const [stockPurchasedVialCount, setStockPurchasedVialCount] = useState("");
  const [stockNumberOfVials, setStockNumberOfVials] = useState("");
  const [stockBatchNumber, setStockBatchNumber] = useState("");
  const [stockManufacturerDate, setStockManufacturerDate] = useState("");
  const [stockOrderedDate, setStockOrderedDate] = useState("");
  const [stockReceivedDate, setStockReceivedDate] = useState("");
  const [stockSupplier, setStockSupplier] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [stockStoredLocation, setStockStoredLocation] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [stockCoaFile, setStockCoaFile] = useState<File | null>(null);
  const [selectedPeptideId, setSelectedPeptideId] = useState<string | null>(null);
  const [refillRequest, setRefillRequest] = useState<RefillRequest | null>(null);
  const [adHocPeptide, setAdHocPeptide] = useState<Peptide | null>(null);
  const [adHocDose, setAdHocDose] = useState("");
  const [adHocUnit, setAdHocUnit] = useState<DoseUnit>("mg");
  const [adHocDate, setAdHocDate] = useState(today);
  const [adHocTime, setAdHocTime] = useState(getCurrentTimeString());
  const [adHocNotes, setAdHocNotes] = useState("");
  const [pendingBackdatedAdHoc, setPendingBackdatedAdHoc] = useState<PendingBackdatedAdHoc | null>(null);
  const [openedDateEdits, setOpenedDateEdits] = useState<Record<string, string>>({});
  const [penSource, setPenSource] = useState<OpenContainerSummaryRow | null>(null);
  const [penName, setPenName] = useState("");
  const [penTransferMl, setPenTransferMl] = useState("");
  const [penExtraBacMl, setPenExtraBacMl] = useState("0");
  const [penUserIds, setPenUserIds] = useState<string[]>([]);
  const [expandedStockGroupKeys, setExpandedStockGroupKeys] = useState<Set<string>>(new Set());
  const [bacWaterHistoryVial, setBacWaterHistoryVial] = useState<BacWaterVial | null>(null);
  const [bacWaterAction, setBacWaterAction] = useState<"addStock" | "open" | "use" | null>(null);
  const [selectedBacWaterVial, setSelectedBacWaterVial] = useState<BacWaterVial | null>(null);
  const [editingBacWaterUseId, setEditingBacWaterUseId] = useState<string | null>(null);
  const [selectedBacWaterStock, setSelectedBacWaterStock] = useState<BacWaterStockItem | null>(null);
  const [bacWaterName, setBacWaterName] = useState("BAC Water");
  const [bacWaterTotalMl, setBacWaterTotalMl] = useState("");
  const [bacWaterVialCount, setBacWaterVialCount] = useState("");
  const [bacWaterUseAmount, setBacWaterUseAmount] = useState("");
  const [bacWaterUseUnit, setBacWaterUseUnit] = useState<"mL" | "units">("mL");
  const [bacWaterUsePurpose, setBacWaterUsePurpose] = useState<BacWaterUsePurpose>("reconstitution");
  const [bacWaterNotes, setBacWaterNotes] = useState("");

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  const storedStockOpen = settings?.find((item) => item.key === vaultStockOpenKey)?.value;
  const storedBacWaterOpen = settings?.find((item) => item.key === vaultBacWaterOpenKey)?.value;
  const storedOpenVialsOpen = settings?.find((item) => item.key === vaultOpenVialsOpenKey)?.value;
  const isStockOpen = stockOpenOverride ?? (typeof storedStockOpen === "boolean" ? storedStockOpen : true);
  const isBacWaterOpen = bacWaterOpenOverride ?? (typeof storedBacWaterOpen === "boolean" ? storedBacWaterOpen : true);
  const isOpenVialsOpen =
    openVialsOpenOverride ?? (typeof storedOpenVialsOpen === "boolean" ? storedOpenVialsOpen : false);

  const toggleStockOpen = () => {
    const nextValue = !isStockOpen;
    setStockOpenOverride(nextValue);
    void putAppSetting(vaultStockOpenKey, nextValue);
  };

  const toggleBacWaterOpen = () => {
    const nextValue = !isBacWaterOpen;
    setBacWaterOpenOverride(nextValue);
    void putAppSetting(vaultBacWaterOpenKey, nextValue);
  };

  const toggleOpenVialsOpen = () => {
    const nextValue = !isOpenVialsOpen;
    setOpenVialsOpenOverride(nextValue);
    void putAppSetting(vaultOpenVialsOpenKey, nextValue);
  };

  const resetStockForm = () => {
    setEditingStockItemId(null);
    setStockName("");
    setStockMgPerVial("");
    setStockPurchasedVialCount("");
    setStockNumberOfVials("");
    setStockBatchNumber("");
    setStockManufacturerDate("");
    setStockOrderedDate("");
    setStockReceivedDate("");
    setStockSupplier("");
    setStockPrice("");
    setStockStoredLocation("");
    setStockNotes("");
    setStockCoaFile(null);
  };

  const closeStockModal = () => {
    resetStockForm();
    setIsStockModalOpen(false);
  };

  const openAddStockModal = () => {
    resetStockForm();
    setIsStockModalOpen(true);
  };

  const openEditStockModal = (item: StockItem) => {
    setEditingStockItemId(item.id);
    setStockName(item.name);
    setStockMgPerVial(item.mgPerVial || "");
    setStockPurchasedVialCount(item.purchasedVialCount || "");
    setStockNumberOfVials(item.numberOfVials || "");
    setStockBatchNumber(item.batchNumber || "");
    setStockManufacturerDate(item.manufacturerDate || "");
    setStockOrderedDate(item.orderedDate || "");
    setStockReceivedDate(item.receivedDate || "");
    setStockSupplier(item.supplier || "");
    setStockPrice(item.price || "");
    setStockStoredLocation(item.storedLocation || "");
    setStockNotes(item.notes || "");
    setStockCoaFile(null);
    setIsStockModalOpen(true);
  };

  const handleOpenVialFromStock = (item: StockItem) => {
    if (!isAvailableStock(item, today)) {
      alert("This stock item is not available to open yet.");
      return;
    }

    const peptideMg = item.mgPerVial ? Number(item.mgPerVial) : undefined;

    navigate("/vault/add", {
      state: {
        sourceStockItemId: item.id,
        prefilledName: item.name,
        peptideMg: peptideMg && Number.isFinite(peptideMg) ? peptideMg : undefined,
      },
    });
  };

  const handleAddUser = async () => {
    const users = vaultUsers || [];
    if (users.length >= 3) {
      alert("The vault can have up to 3 users.");
      return;
    }
    const fallbackName = `User ${users.length + 1}`;
    const displayName = window.prompt("Name for this user?", fallbackName) || fallbackName;
    await createVaultUser(displayName);
  };

  const handleRenameUser = async (userId: string, currentName: string) => {
    const displayName = window.prompt("Rename user", currentName);
    if (!displayName) return;
    await renameVaultUser(userId, displayName);
  };

  const handleSaveStockItem = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stockName.trim()) {
      alert("Peptide name is required.");
      return;
    }

    if (!editingStockItemId && (!stockPurchasedVialCount || Number(stockPurchasedVialCount) <= 0)) {
      alert("Enter how many vials were purchased.");
      return;
    }

    if (stockCoaFile && stockCoaFile.size > maxCoaFileBytes) {
      alert("COA attachments must be 500 KiB or smaller so backups and cloud sync remain reliable.");
      return;
    }

    const now = new Date().toISOString();
    let coaDataUrl: string | undefined;

    if (stockCoaFile) {
      coaDataUrl = await fileToDataUrl(stockCoaFile);
    }

    const existingItem = editingStockItemId ? await db.stockItems.get(editingStockItemId) : null;
    const item: StockItem = {
      id: existingItem?.id || crypto.randomUUID(),
      name: stockName.trim(),
      productKey: getStockProductKeyFromValues(stockName, stockMgPerVial),
      mgPerVial: stockMgPerVial.trim() || undefined,
      purchasedVialCount: stockPurchasedVialCount.trim() || existingItem?.purchasedVialCount || undefined,
      numberOfVials: stockNumberOfVials.trim() || undefined,
      batchNumber: stockBatchNumber.trim() || undefined,
      manufacturerDate: stockManufacturerDate || undefined,
      orderedDate: stockOrderedDate || undefined,
      receivedDate: stockReceivedDate || undefined,
      supplier: stockSupplier.trim() || undefined,
      price: stockPrice.trim() || undefined,
      storedLocation: stockStoredLocation.trim() || undefined,
      notes: stockNotes.trim() || undefined,
      coaFileName: stockCoaFile?.name || existingItem?.coaFileName,
      coaDataUrl: coaDataUrl || existingItem?.coaDataUrl,
      createdAt: existingItem?.createdAt || now,
      updatedAt: now,
    };

    await db.stockItems.put(item);
    closeStockModal();
  };

  const handleDeleteStockItem = async (id: string) => {
    if (!confirm("Remove this stock item?")) return;
    const nowIso = new Date().toISOString();
    await db.stockItems.update(id, {
      deletedAt: nowIso,
      updatedAt: nowIso,
    });
  };

  const closeBacWaterModal = () => {
    setBacWaterAction(null);
    setSelectedBacWaterVial(null);
    setEditingBacWaterUseId(null);
    setSelectedBacWaterStock(null);
    setBacWaterName("BAC Water");
    setBacWaterTotalMl("");
    setBacWaterVialCount("");
    setBacWaterUseAmount("");
    setBacWaterUseUnit("mL");
    setBacWaterUsePurpose("reconstitution");
    setBacWaterNotes("");
  };

  const openBacWaterVialModal = (stockItem?: BacWaterStockItem) => {
    closeBacWaterModal();
    if (stockItem) {
      setSelectedBacWaterStock(stockItem);
      setBacWaterName(stockItem.name);
      setBacWaterTotalMl(String(stockItem.volumeMlPerVial));
    }
    setBacWaterAction("open");
  };

  const openBacWaterStockModal = () => {
    closeBacWaterModal();
    setBacWaterAction("addStock");
  };

  const openBacWaterUseModal = (vial: BacWaterVial, useId?: string) => {
    closeBacWaterModal();
    const existingUse = useId ? vial.uses.find((use) => use.id === useId) : undefined;
    setSelectedBacWaterVial(vial);
    setEditingBacWaterUseId(existingUse?.id || null);
    setBacWaterUseAmount(existingUse ? String(existingUse.amountMl) : "");
    setBacWaterUsePurpose(existingUse?.purpose || "reconstitution");
    setBacWaterNotes(existingUse?.notes || "");
    setBacWaterAction("use");
  };

  const openBacWaterHistory = (vial: BacWaterVial) => setBacWaterHistoryVial(vial);
  const closeBacWaterHistory = () => setBacWaterHistoryVial(null);

  const handleSaveBacWater = async (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();

    if (bacWaterAction === "addStock") {
      const volumeMlPerVial = Number(bacWaterTotalMl);
      const numberOfVials = Number(bacWaterVialCount);
      if (!Number.isFinite(volumeMlPerVial) || volumeMlPerVial <= 0 || !Number.isInteger(numberOfVials) || numberOfVials <= 0) {
        alert("Enter a vial size and whole number of vials greater than zero.");
        return;
      }
      await db.bacWaterStockItems.put({ id: crypto.randomUUID(), name: bacWaterName.trim() || "BAC Water", volumeMlPerVial, purchasedVialCount: numberOfVials, numberOfVials, notes: bacWaterNotes.trim() || undefined, createdAt: now, updatedAt: now });
      closeBacWaterModal();
      return;
    }

    if (bacWaterAction === "open") {
      const totalMl = Number(bacWaterTotalMl);
      if (!Number.isFinite(totalMl) || totalMl <= 0) {
        alert("Enter a vial volume greater than zero.");
        return;
      }
      if (selectedBacWaterStock && selectedBacWaterStock.numberOfVials <= 0) {
        alert("There are no unopened vials left in this stock lot.");
        return;
      }
      await db.transaction("rw", [db.bacWaterVials, db.bacWaterStockItems], async () => {
        const existingVials = await db.bacWaterVials.toArray();
        const activeVial = activeRecords(existingVials)
          .filter((vial) => vial.remainingMl > BAC_EMPTY_THRESHOLD_ML)
          .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];

        // BAC water is tracked as one usable open supply. Opening another vial tops up
        // the current amount so a partly used vial never leaves a separate empty card behind.
        if (activeVial) {
          await db.bacWaterVials.update(activeVial.id, {
            totalMl: activeVial.totalMl + totalMl,
            remainingMl: activeVial.remainingMl + totalMl,
            updatedAt: now,
          });
        } else {
          await db.bacWaterVials.put({
            id: crypto.randomUUID(),
            name: bacWaterName.trim() || "BAC Water",
            totalMl,
            remainingMl: totalMl,
            openedAt: now,
            uses: [],
            sourceStockItemId: selectedBacWaterStock?.id,
            notes: bacWaterNotes.trim() || undefined,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Retire prior zero-volume records. They remain in backups but no longer appear as open vials.
        for (const vial of activeRecords(existingVials).filter((vial) => vial.remainingMl <= BAC_EMPTY_THRESHOLD_ML)) {
          await db.bacWaterVials.update(vial.id, { remainingMl: 0, deletedAt: now, updatedAt: now });
        }
        if (selectedBacWaterStock) {
          await db.bacWaterStockItems.update(selectedBacWaterStock.id, {
            numberOfVials: selectedBacWaterStock.numberOfVials - 1,
            updatedAt: now,
          });
        }
      });
      closeBacWaterModal();
      return;
    }

    if (!selectedBacWaterVial) return;
    const enteredAmount = Number(bacWaterUseAmount);
    const amountMl = bacWaterUseUnit === "units" ? enteredAmount / 100 : enteredAmount;
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      alert("Enter an amount greater than zero.");
      return;
    }
    const existingUse = editingBacWaterUseId
      ? selectedBacWaterVial.uses.find((use) => use.id === editingBacWaterUseId)
      : undefined;
    const availableMl = selectedBacWaterVial.remainingMl + (existingUse?.amountMl || 0);
    if (amountMl > availableMl + Number.EPSILON) {
      alert("This use is greater than the amount remaining in the vial.");
      return;
    }
    const remainingMl = Math.max(0, availableMl - amountMl);
    await db.bacWaterVials.update(selectedBacWaterVial.id, {
      remainingMl,
      uses: existingUse
        ? selectedBacWaterVial.uses.map((use) =>
            use.id === existingUse.id
              ? { ...use, amountMl, purpose: bacWaterUsePurpose, notes: bacWaterNotes.trim() || undefined }
              : use
          )
        : [...selectedBacWaterVial.uses, { id: crypto.randomUUID(), usedAt: now, amountMl, purpose: bacWaterUsePurpose, notes: bacWaterNotes.trim() || undefined }],
      updatedAt: now,
      ...(remainingMl <= BAC_EMPTY_THRESHOLD_ML ? { deletedAt: now } : {}),
    });
    closeBacWaterModal();
  };

  const handleDeleteBacWaterUse = async (vial: BacWaterVial, useId: string) => {
    const use = vial.uses.find((item) => item.id === useId);
    if (!use || !confirm("Remove this BAC water use entry?")) return;
    await db.bacWaterVials.update(vial.id, {
      remainingMl: Math.min(vial.totalMl, vial.remainingMl + use.amountMl),
      uses: vial.uses.filter((item) => item.id !== useId),
      updatedAt: new Date().toISOString(),
    });
    setBacWaterHistoryVial(null);
  };

  const closeRefillModal = () => {
    setRefillRequest(null);
  };

  const closeAdHocModal = () => {
    setAdHocPeptide(null);
    setAdHocDose("");
    setAdHocUnit("mg");
    setAdHocDate(today);
    setAdHocTime(getCurrentTimeString());
    setAdHocNotes("");
    setPendingBackdatedAdHoc(null);
  };

  const openAdHocModal = (peptide: Peptide) => {
    setAdHocPeptide(peptide);
    setAdHocDose("");
    setAdHocUnit(peptide.desiredDoseUnit);
    setAdHocDate(today);
    setAdHocTime(getCurrentTimeString());
    setAdHocNotes("");
  };

  const saveAdHocInjection = async (inventoryAssignment: "assigned" | "unassigned") => {
    if (!adHocPeptide) return;

    const doseValue = Number(adHocDose);
    const doseMcg = normalizeDoseToMcg(doseValue, adHocUnit);
    const remainingMcg = vialStatusByPeptideId.get(adHocPeptide.id)?.remainingMcg ?? getCurrentVialTotalMcg(adHocPeptide);
    if (!Number.isFinite(doseValue) || doseValue <= 0) {
      alert("Enter a dose greater than zero.");
      return;
    }
    if (inventoryAssignment === "assigned" && doseMcg > remainingMcg) {
      alert("This dose is greater than the amount remaining in the vial.");
      return;
    }

    const draw = getDrawForDose(adHocPeptide, doseValue, adHocUnit);
    const nowIso = new Date().toISOString();
    await logInjectionEvent({
      id: crypto.randomUUID(),
      peptideId: adHocPeptide.id,
      vaultUserId: adHocPeptide.vaultUserId,
      ...(inventoryAssignment === "assigned" ? { openVialId: adHocPeptide.openVialId || adHocPeptide.id } : {}),
      peptideNameSnapshot: adHocPeptide.name,
      scheduledDate: adHocDate,
      actualDateTime: buildLocalDateTimeIso(adHocDate, adHocTime),
      doseValue,
      doseUnit: adHocUnit,
      drawMl: draw.drawMl,
      drawUnits: draw.drawUnits,
      status: "taken",
      entryType: "adHoc",
      inventoryAssignment,
      notes: adHocNotes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    closeAdHocModal();
  };

  const handleSaveAdHocInjection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adHocPeptide) return;

    const injectionTime = buildLocalDateTimeIso(adHocDate, adHocTime);
    if (adHocPeptide.currentVialStartedAt && injectionTime < adHocPeptide.currentVialStartedAt) {
      setPendingBackdatedAdHoc({ openedDate: adHocPeptide.currentVialStartedAt.slice(0, 10) });
      return;
    }
    await saveAdHocInjection("assigned");
  };

  const openRefillFromStockModal = (peptide: Peptide, options: StockItem[]) => {
    setRefillRequest({ peptide, stockOptions: options });
  };

  const handleConfirmRefillFromStock = async (stockItem: StockItem, reconstitutionBacWaterMl: number) => {
    if (!refillRequest) return;
    const existingRemainingMg = vialStatusByPeptideId.get(refillRequest.peptide.id)?.remainingMg || 0;
    await refillOpenVialFromStock({
      peptide: refillRequest.peptide,
      stockItem,
      existingRemainingMg,
      today,
      reconstitutionBacWaterMl,
    });
    setSelectedPeptideId(refillRequest.peptide.id);
    closeRefillModal();
  };

  const handleMarkEfficacyVerified = async (peptide: Peptide) => {
    await db.peptides.update(peptide.id, {
      efficacyVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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
      });
    } catch {
      return dateStr;
    }
  };

  const getDrawForDose = (peptide: Peptide, doseValue: number, doseUnit: Peptide["desiredDoseUnit"]) => {
    const doseMcg = normalizeDoseToMcg(doseValue, doseUnit);
    const drawMl = peptide.concentrationMcgPerMl > 0 ? doseMcg / peptide.concentrationMcgPerMl : 0;
    return {
      drawMl,
      drawUnits: drawMl * peptide.unitsPerMl,
    };
  };

  const peptideById = useMemo(
    () => new Map((peptides || []).map((peptide) => [peptide.id, peptide])),
    [peptides]
  );

  const scheduleByPeptideId = useMemo(
    () => makePreferredScheduleMap(schedules || []),
    [schedules]
  );

  const peptidesByName = useMemo(() => {
    const map = new Map<string, Peptide[]>();
    for (const peptide of peptides || []) {
      const key = normalizePeptideName(peptide.name);
      map.set(key, [...(map.get(key) || []), peptide]);
    }
    return map;
  }, [peptides]);

  const stockItemsByName = useMemo(() => {
    const map = new Map<string, StockItem[]>();
    for (const item of stockItems || []) {
      const key = normalizePeptideName(item.name);
      map.set(key, [...(map.get(key) || []), item]);
    }
    return map;
  }, [stockItems]);

  const stockGroups = useMemo(() => groupStockItems(stockItems || []), [stockItems]);

  const availableStockByPeptideId = useMemo(() => {
    const map = new Map<string, StockItem[]>();
    for (const peptide of peptides || []) {
      const options = (stockItemsByName.get(normalizePeptideName(peptide.name)) || []).filter((item) =>
        isAvailableStock(item, today)
      );
      map.set(peptide.id, options);
    }
    return map;
  }, [peptides, stockItemsByName, today]);

  const getAvailableStockForPeptide = (peptide: Peptide) => {
    return availableStockByPeptideId.get(peptide.id) || [];
  };

  const logsByPeptideId = useMemo(() => {
    const map = new Map<string, InjectionLog[]>();
    for (const log of logs || []) {
      map.set(log.peptideId, [...(map.get(log.peptideId) || []), log]);
    }
    return map;
  }, [logs]);

  const vialStatusByPeptideId = buildVialStatusByPeptideId(peptides, logs, vialAdjustments);

  const sharedProjectionByPeptideId = useMemo(() => {
    const map = new Map<string, { injectionCount: number; emptyDate: string | null }>();
    if (!peptides || !schedules || !logs || !vialAdjustments) return map;

    for (const peptide of peptides) {
      map.set(peptide.id, getSharedOpenVialProjection(peptide, peptides, schedules, logs, today, vialAdjustments));
    }
    return map;
  }, [logs, peptides, schedules, today, vialAdjustments]);

  const stockProjectionByGroupKey = useMemo(() => {
    const map = new Map<string, StockProjection>();
    if (!peptides || !schedules) return map;

    const activeSchedulesByName = new Map<string, PeptideSchedule[]>();
    for (const schedule of schedules) {
      if (!schedule.isActive) continue;
      const peptide = peptideById.get(schedule.peptideId);
      if (!peptide) continue;
      const key = normalizePeptideName(peptide.name);
      activeSchedulesByName.set(key, [...(activeSchedulesByName.get(key) || []), schedule]);
    }

    for (const group of stockGroups) {
      const mgPerVial = group.mgPerVial ?? NaN;
      const vialCount = group.lots
        .filter((item) => isReceivedStock(item, today))
        .reduce((sum, item) => sum + Math.max(0, Number(item.numberOfVials) || 0), 0);
      if (!Number.isFinite(mgPerVial) || mgPerVial <= 0 || vialCount <= 0) continue;

      const normalizedStockName = normalizePeptideName(group.name);
      const matchingPeptides = peptidesByName.get(normalizedStockName) || [];
      if (matchingPeptides.length === 0) continue;

      const matchingSchedules = activeSchedulesByName.get(normalizedStockName) || [];
      const match =
        matchingPeptides.find((peptide) => scheduleByPeptideId.get(peptide.id)?.isActive) ||
        matchingPeptides[0];

      if (matchingSchedules.length === 0) {
        const doseMcg = normalizeDoseToMcg(match.desiredDoseValue, match.desiredDoseUnit);
        const totalMcg = mgPerVial * vialCount * 1000;
        if (doseMcg > 0) {
          map.set(group.key, {
            sourceName: match.name,
            injectionCount: Math.floor(totalMcg / doseMcg),
            emptyDate: null,
            daysUntilEmpty: null,
            scheduleLabel: "Using setup dose",
          });
        }
        continue;
      }

      const stockPeptide: Peptide = {
        ...match,
        id: `stock-${group.key}`,
        openVialId: `stock-${group.key}`,
        vialMg: mgPerVial * vialCount,
        currentVialTotalMg: mgPerVial * vialCount,
      };
      const projectionSchedules = matchingSchedules.map((schedule) => ({
        ...schedule,
        openVialId: stockPeptide.openVialId,
      }));
      const projection = getSharedOpenVialProjection(
        stockPeptide,
        matchingPeptides,
        projectionSchedules,
        [],
        today
      );
      const emptyDate = projection.emptyDate;
      const daysUntilEmpty = emptyDate
        ? Math.max(
            0,
            Math.ceil(
              (parseLocalDate(emptyDate).getTime() - parseLocalDate(today).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : null;

      map.set(group.key, {
        sourceName: match.name,
        injectionCount: projection.injectionCount,
        emptyDate,
        daysUntilEmpty,
        scheduleLabel: `Using ${matchingSchedules.length} active dosing schedule${matchingSchedules.length === 1 ? "" : "s"}`,
      });
    }

    return map;
  }, [peptideById, peptides, peptidesByName, scheduleByPeptideId, schedules, stockGroups, today]);

  const protocolPeptides = useMemo(
    () => (peptides || []).filter((peptide) => !peptide.isContainerOnly),
    [peptides]
  );
  const openVialCount = new Set((peptides || []).map((peptide) => peptide.openVialId || peptide.id)).size;
  const stockCount = stockGroups.length;
  const visibleVaultUsers = useMemo(
    () => vaultUsers?.filter((user) => !user.isArchived) || [],
    [vaultUsers]
  );
  const vaultUserById = useMemo(
    () => new Map((vaultUsers || []).map((user) => [user.id, user])),
    [vaultUsers]
  );
  const peptidesByUserId = useMemo(() => {
    const map = new Map<string, Peptide[]>();
    for (const peptide of protocolPeptides) {
      const userId = peptide.vaultUserId || DEFAULT_VAULT_USER_ID;
      map.set(userId, [...(map.get(userId) || []), peptide]);
    }
    return map;
  }, [protocolPeptides]);
  const openVialSummaryRows = (() => {
    const rows = new Map<string, OpenContainerSummaryRow>();
    for (const peptide of peptides || []) {
      const openVialId = peptide.openVialId || peptide.id;
      if (rows.has(openVialId)) {
        const row = rows.get(openVialId);
        if (row) {
          row.members.push(peptide);
          if (peptide.isContainerOnly) row.peptide = peptide;
        }
        continue;
      }
      const status = vialStatusByPeptideId.get(peptide.id);
      const emptyDate = sharedProjectionByPeptideId.get(peptide.id)?.emptyDate;
      const daysRemaining = emptyDate
        ? Math.max(0, Math.round((parseLocalDate(emptyDate).getTime() - parseLocalDate(today).getTime()) / 86_400_000))
        : null;
      rows.set(openVialId, {
        openVialId,
        peptide,
        members: [peptide],
        remainingMg: status?.remainingMg ?? peptide.vialMg,
        percent: status?.percent ?? 100,
        daysRemaining,
        openedDate: (peptide.currentVialStartedAt || peptide.createdAt).slice(0, 10),
      });
    }
    return [...rows.values()]
      .filter((row) => row.remainingMg > 0.000001)
      .sort((left, right) => {
        const leftIsPen = left.peptide.containerType === "pen";
        const rightIsPen = right.peptide.containerType === "pen";
        if (leftIsPen !== rightIsPen) return leftIsPen ? 1 : -1;
        return (left.peptide.containerLabel || left.peptide.name).localeCompare(right.peptide.containerLabel || right.peptide.name);
      });
  })();

  const openPenModal = (source: OpenContainerSummaryRow) => {
    const sourceUsers = [...new Set(source.members.filter((member) => !member.isContainerOnly).map((member) => member.vaultUserId || DEFAULT_VAULT_USER_ID))];
    setPenSource(source);
    setPenName(`${source.peptide.name} Pen`);
    setPenTransferMl("");
    setPenExtraBacMl("0");
    setPenUserIds(sourceUsers);
  };

  const closePenModal = () => setPenSource(null);

  const createPenFromVial = async () => {
    if (!penSource) return;
    const source = penSource.peptide;
    const sourceConcentration = source.concentrationMgPerMl;
    const transferMl = Number(penTransferMl);
    const extraBacMl = Number(penExtraBacMl || 0);
    const remainingMl = sourceConcentration > 0 ? penSource.remainingMg / sourceConcentration : 0;
    if (!Number.isFinite(transferMl) || transferMl <= 0 || transferMl > remainingMl + 0.000001) {
      alert(`Enter an amount between 0 and ${remainingMl.toFixed(2)} mL.`);
      return;
    }
    if (!Number.isFinite(extraBacMl) || extraBacMl < 0) {
      alert("Enter a valid additional BAC amount.");
      return;
    }
    const transferMg = transferMl * sourceConcentration;
    const penVolumeMl = transferMl + extraBacMl;
    if (penVolumeMl <= 0 || transferMg <= 0) return;
    const nowIso = new Date().toISOString();
    const penId = crypto.randomUUID();
    const concentrationMgPerMl = transferMg / penVolumeMl;
    const concentrationMcgPerMl = concentrationMgPerMl * 1000;
    const doseMcg = normalizeDoseToMcg(source.desiredDoseValue, source.desiredDoseUnit);
    const pen: Peptide = {
      ...source,
      id: penId,
      vialMg: transferMg,
      bacWaterMl: penVolumeMl,
      concentrationMgPerMl,
      concentrationMcgPerMl,
      doseMl: doseMcg > 0 ? doseMcg / concentrationMcgPerMl : 0,
      doseUnits: doseMcg > 0 ? (doseMcg / concentrationMcgPerMl) * source.unitsPerMl : 0,
      estimatedDosesPerVial: doseMcg > 0 ? (transferMg * 1000) / doseMcg : 0,
      percentOfVialPerDose: transferMg > 0 ? (doseMcg / (transferMg * 1000)) * 100 : 0,
      currentVialTotalMg: transferMg,
      currentVialStartedAt: nowIso,
      openVialId: penId,
      sourceOpenVialId: penSource.openVialId,
      containerType: "pen",
      isContainerOnly: true,
      containerLabel: penName.trim() || `${source.name} Pen`,
      sharedWithUserIds: penUserIds,
      vaultUserId: penUserIds[0] || source.vaultUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const transferAdjustment: VialAdjustment = {
      id: crypto.randomUUID(),
      peptideId: source.id,
      vaultUserId: source.vaultUserId,
      openVialId: penSource.openVialId,
      peptideNameSnapshot: source.name,
      adjustmentDate: today,
      amountValue: transferMl,
      amountUnit: "mL",
      amountMcg: transferMg * 1000,
      reason: "transferToPen",
      notes: `Transferred to ${pen.containerLabel}.`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await db.transaction("rw", [db.peptides, db.vialAdjustments], async () => {
      await db.peptides.put(pen);
      await db.vialAdjustments.put(transferAdjustment);
    });
    closePenModal();
  };

  const saveOpenedDateForVial = async (openVialId: string, members: Peptide[], fallbackDate: string) => {
    const openedDate = openedDateEdits[openVialId] || fallbackDate;
    if (!openedDate) return;
    const nowIso = new Date().toISOString();
    const startedAt = buildLocalDateTimeIso(openedDate, "12:00");
    await db.transaction("rw", db.peptides, async () => {
      for (const peptide of members) {
        await db.peptides.update(peptide.id, { currentVialStartedAt: startedAt, updatedAt: nowIso });
      }
    });
    setOpenedDateEdits((current) => ({ ...current, [openVialId]: openedDate }));
  };
  const selectedPeptide =
    (selectedPeptideId ? peptideById.get(selectedPeptideId) : undefined) || protocolPeptides[0] || null;
  const selectedPeptideLogs =
    selectedPeptide ? logsByPeptideId.get(selectedPeptide.id) || [] : [];
  const selectedPeptideSchedule =
    selectedPeptide ? scheduleByPeptideId.get(selectedPeptide.id) : undefined;

  return (
    <div className="fade-in vault-page" style={{ paddingBottom: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)" }}>
            Vault
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {stockCount} in stock • {openVialCount} open vials
          </p>
        </div>

        <Button variant="primary" onClick={() => navigate("/vault/add")}>
          <Plus size={18} />
          Add Peptide
        </Button>
      </div>

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", marginBottom: "4px" }}>Vault Users</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Shared stock and open vials, separate dosing plans.
            </p>
          </div>
          <Button variant="secondary" onClick={handleAddUser} disabled={(vaultUsers?.length || 0) >= 3}>
            <Plus size={16} />
            Add User
          </Button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
          {visibleVaultUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleRenameUser(user.id, user.displayName)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.03)",
                color: "var(--text-primary)",
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 700,
              }}
              title="Rename user"
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: user.color,
                  display: "inline-block",
                }}
              />
              {user.displayName}
              <Edit2 size={13} style={{ color: "var(--text-muted)" }} />
            </button>
          ))}
        </div>
      </Card>

      <div className="vault-desktop-layout" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="vault-list-column" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <Card className="bac-water-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <button type="button" onClick={toggleBacWaterOpen} style={{ flex: 1, background: "none", border: "none", color: "inherit", display: "flex", alignItems: "center", gap: "10px", textAlign: "left", padding: 0, cursor: "pointer" }}>
              <Droplets size={20} style={{ color: "var(--color-primary)" }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "1.05rem", margin: 0 }}>BAC Water</h2>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Stock, open vials, and recorded uses</span>
              </div>
              {isBacWaterOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <Button variant="secondary" onClick={openBacWaterStockModal}><Plus size={16} /> Add Stock</Button>
          </div>
          {!isBacWaterOpen && <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "12px 0 0" }}>{(bacWaterStockItems || []).reduce((sum, item) => sum + item.numberOfVials, 0)} unopened · {openBacWaterVials.length} open vial{openBacWaterVials.length === 1 ? "" : "s"}</p>}
          {isBacWaterOpen && <>
          {(bacWaterStockItems || []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
              {(bacWaterStockItems || []).map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px", background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <strong>{item.name} · {formatMl(item.volumeMlPerVial)} vials</strong>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", margin: "4px 0 0" }}>{item.numberOfVials} of {item.purchasedVialCount} unopened remaining</p>
                  </div>
                  <Button variant="secondary" onClick={() => openBacWaterVialModal(item)} disabled={item.numberOfVials <= 0}>Open One</Button>
                </div>
              ))}
            </div>
          )}
          {openBacWaterVials.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
              {openBacWaterVials.map((vial) => {
                const daysOpen = Math.max(
                  0,
                  Math.floor((parseLocalDate(today).getTime() - new Date(vial.openedAt).getTime()) / 86_400_000)
                );
                return (
                  <div key={vial.id} style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div>
                        <strong>{vial.name}</strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                          <span className="badge">{formatMl(vial.remainingMl)} remaining</span>
                          <span className="badge">{formatUnits(vial.remainingMl * 100)}</span>
                          <span className="badge">Open {daysOpen} day{daysOpen === 1 ? "" : "s"}</span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", margin: "8px 0 0" }}>
                          {vial.uses.length} use{vial.uses.length === 1 ? "" : "s"} recorded · opened {new Date(vial.openedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="primary" onClick={() => openBacWaterUseModal(vial)}>Record Use</Button>
                    </div>
                    <Button variant="secondary" fullWidth style={{ marginTop: "12px" }} onClick={() => openBacWaterHistory(vial)}>Use History ({vial.uses.length})</Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "14px 0 0" }}>No open BAC water vials. Add stock, then open a vial to track its remaining volume and uses.</p>
          )}
          </>}
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <button
              onClick={toggleStockOpen}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textAlign: "left",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <Package size={20} style={{ color: "var(--color-primary)" }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Stock</h2>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Unopened products and COAs
                </span>
              </div>
              {isStockOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            <Button variant="secondary" onClick={openAddStockModal}>
              <Plus size={16} />
              Add Purchase
            </Button>
          </div>

          {!isStockOpen && stockGroups.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              {stockGroups.map((group) => {
                const stockProjection = stockProjectionByGroupKey.get(group.key);
                const daysLabel =
                  stockProjection?.daysUntilEmpty !== null &&
                  stockProjection?.daysUntilEmpty !== undefined
                    ? `${stockProjection.daysUntilEmpty} days`
                    : "No active schedule";

                return (
                  <div
                    key={`collapsed-${group.key}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "var(--border-radius-sm)",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                      {group.name} {group.mgPerVial !== null ? `${group.mgPerVial} mg` : ""}
                    </span>
                    <span style={{ color: "var(--text-secondary)", textAlign: "right" }}>
                      {group.remainingVials} vial{group.remainingVials === 1 ? "" : "s"}
                      {group.totalRemainingMg !== null ? ` / ${Number(group.totalRemainingMg.toFixed(2))} mg` : ""} - {daysLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isStockOpen && (
            <div className="vault-stock-grid" style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {stockGroups.length > 0 ? (
                stockGroups.map((group) => {
                  const stockProjection = stockProjectionByGroupKey.get(group.key);
                  const availableLots = sortStockLotsForUse(group.lots.filter((item) => isAvailableStock(item, today)));
                  const matchingOpenPeptides = peptidesByName.get(normalizePeptideName(group.name)) || [];
                  const uniqueOpenVialTargets = getUniqueOpenVialTargets(matchingOpenPeptides);
                  const isHistoryOpen = expandedStockGroupKeys.has(group.key);

                  return (
                    <div
                      key={group.key}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "12px",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <div>
                        <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>{group.name}</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {group.mgPerVial !== null && (
                            <span className="badge">{group.mgPerVial} mg/vial</span>
                          )}
                          <span className="badge">{group.remainingVials} remaining</span>
                          <span className="badge">{group.lots.length} purchase{group.lots.length === 1 ? "" : "s"}</span>
                        </div>
                      </div>

                    </div>

                    {stockProjection && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: "8px",
                          marginTop: "10px",
                        }}
                      >
                        <div className="metric-tile">
                          <span>Stock Injections</span>
                          <strong>{stockProjection.injectionCount}</strong>
                        </div>
                        <div className="metric-tile">
                          <span>Stock Empty</span>
                          <strong>
                            {stockProjection.daysUntilEmpty !== null
                              ? `${stockProjection.daysUntilEmpty} days`
                              : "N/A"}
                          </strong>
                        </div>
                        <p
                          style={{
                            gridColumn: "1 / -1",
                            color: "var(--text-muted)",
                            fontSize: "0.76rem",
                            lineHeight: 1.4,
                            margin: 0,
                          }}
                        >
                          {stockProjection.scheduleLabel} from open {stockProjection.sourceName}
                          {stockProjection.emptyDate ? ` • empty around ${getFriendlyDate(stockProjection.emptyDate)}` : ""}
                        </p>
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                      {uniqueOpenVialTargets.map((peptide) => {
                        const userName = vaultUserById.get(peptide.vaultUserId || DEFAULT_VAULT_USER_ID)?.displayName;
                        return (
                        <Button
                          key={peptide.openVialId || peptide.id}
                          variant="secondary"
                          onClick={() => openRefillFromStockModal(peptide, availableLots)}
                          disabled={availableLots.length === 0}
                        >
                          <Package size={16} /> Pull for {uniqueOpenVialTargets.length > 1 && userName ? `${userName}'s ` : ""}{peptide.name} ({peptide.vialMg} mg)
                        </Button>
                        );
                      })}
                      {uniqueOpenVialTargets.length === 0 && (
                        <Button
                          variant="secondary"
                          onClick={() => availableLots[0] && handleOpenVialFromStock(availableLots[0])}
                          disabled={availableLots.length === 0}
                        >
                          <Dna size={16} /> {availableLots.length ? "Open First Vial" : "No Vials Available"}
                        </Button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedStockGroupKeys((current) => {
                        const next = new Set(current);
                        if (next.has(group.key)) next.delete(group.key); else next.add(group.key);
                        return next;
                      })}
                      style={{ width: "100%", marginTop: "12px", padding: "9px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.02)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                    >
                      <span>Purchases & batches ({group.lots.length})</span>
                      {isHistoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isHistoryOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {group.lots.map((item) => (
                          <div key={item.id} style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px", background: "rgba(0,0,0,0.08)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                <strong style={{ color: "var(--text-primary)" }}>{item.supplier || "Unknown vendor"}</strong>
                                {item.batchNumber ? ` • Batch ${item.batchNumber}` : " • No batch"}<br />
                                Purchased: {item.purchasedVialCount || "Legacy/unknown"} • Remaining: {item.numberOfVials || "0"} • Price: {item.price || "N/A"}<br />
                                Manufactured: {item.manufacturerDate || "N/A"} • Ordered: {item.orderedDate || "N/A"} • Delivered: {item.receivedDate || "N/A"}<br />
                                Stored: {item.storedLocation || "N/A"}
                              </div>
                              <div style={{ display: "flex", gap: "4px", alignSelf: "flex-start" }}>
                                <button onClick={() => openEditStockModal(item)} aria-label={`Edit ${item.name} purchase`} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}><Edit2 size={15} /></button>
                                <button onClick={() => handleDeleteStockItem(item.id)} aria-label={`Remove ${item.name} purchase`} style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "4px" }}><Trash2 size={15} /></button>
                              </div>
                            </div>
                            {item.notes && <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "6px" }}>Notes: {item.notes}</p>}
                            {item.coaDataUrl && <a href={item.coaDataUrl} download={item.coaFileName || `${item.name}-coa`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "0.82rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}><FileText size={15} />{item.coaFileName || "Download COA"}</a>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    border: "1px dashed var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  No stock added yet.
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <button
            onClick={toggleOpenVialsOpen}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <Dna size={20} style={{ color: "var(--color-primary)" }} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Open Containers</h2>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Physical vials and pens currently in use across the vault
              </span>
            </div>
            {isOpenVialsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {!isOpenVialsOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              {openVialSummaryRows.length > 0 ? openVialSummaryRows.map(({ openVialId, peptide, remainingMg, percent, daysRemaining, openedDate }) => (
                <button
                  key={openVialId}
                  type="button"
                  onClick={toggleOpenVialsOpen}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 10px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.78rem",
                  }}
                >
                  <span style={{ color: "var(--text-primary)", fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peptide.containerLabel || peptide.name}</span>
                  <span className="badge">{peptide.containerType === "pen" ? "pen" : "vial"}</span>
                  <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>{remainingMg.toFixed(2)} mg ({percent.toFixed(0)}%)</span>
                  <span style={{ whiteSpace: "nowrap" }}>{formatMgPerMl(peptide.concentrationMgPerMl)}</span>
                  <span style={{ whiteSpace: "nowrap", color: daysRemaining !== null && daysRemaining <= 7 ? "var(--color-danger)" : "inherit" }}>{daysRemaining === null ? "No estimate" : daysRemaining === 0 ? "Empty" : `${daysRemaining} d left`}</span>
                  <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>Opened {openedDate}</span>
                </button>
              )) : (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", margin: "4px 0 0" }}>No open vials yet.</p>
              )}
            </div>
          )}

          {isOpenVialsOpen && (
            <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
              {openVialSummaryRows.map(({ openVialId, peptide, members, remainingMg, percent, daysRemaining, openedDate }) => (
                <div key={openVialId} style={{ padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)", display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) 150px", alignItems: "center", gap: "12px" }}>
                  {peptide.containerType === "pen" ? (
                    <PenFillGraphic percent={percent} remainingMg={remainingMg} />
                  ) : (
                    <VialFillGraphic percent={percent} remainingMg={remainingMg} />
                  )}
                  <div>
                    <strong style={{ display: "block", fontSize: "1rem" }}>{peptide.containerLabel || peptide.name}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700 }}>{peptide.containerType === "pen" ? "Reusable pen" : "Open vial"}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{formatMgPerMl(peptide.concentrationMgPerMl)}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", marginTop: "12px", fontSize: "0.86rem" }}>
                      <strong>{remainingMg.toFixed(2)} mg ({percent.toFixed(0)}%)</strong>
                      <span style={{ color: daysRemaining !== null && daysRemaining <= 7 ? "var(--color-danger)" : "var(--text-secondary)" }}>
                        {daysRemaining === null ? "No empty estimate" : daysRemaining === 0 ? "Empty" : `${daysRemaining} days left`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
                    <Input label="Date opened" type="date" value={openedDateEdits[openVialId] ?? openedDate} onChange={(event) => setOpenedDateEdits((current) => ({ ...current, [openVialId]: event.target.value }))} />
                    <Button type="button" variant="secondary" onClick={() => void saveOpenedDateForVial(openVialId, members, openedDate)}>Save</Button>
                    {peptide.containerType !== "pen" && (
                      <Button type="button" variant="primary" onClick={() => openPenModal({ openVialId, peptide, members, remainingMg, percent, daysRemaining, openedDate })}>Create Pen</Button>
                    )}
                  </div>
                </div>
              ))}
              {peptides && peptides.length === 0 && (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    border: "1px dashed var(--border-color)",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.01)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "50%",
                      background: "rgba(99, 102, 241, 0.1)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Dna size={36} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>No Open Containers</h3>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        maxWidth: "280px",
                      }}
                    >
                      Open a vial from the calculator or add one manually to start tracking.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </Card>

        <Card style={{ marginTop: "14px" }}>
          <h2 style={{ fontSize: "1.05rem", margin: "0 0 14px" }}>Protocols by User</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {peptides &&
                schedules &&
                logs &&
                visibleVaultUsers.map((user) => {
                  const userPeptides = peptidesByUserId.get(user.id) || [];
                  if (userPeptides.length === 0) {
                    return (
                      <section key={user.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: user.color }} />
                          <h3 style={{ fontSize: "1rem", margin: 0 }}>{user.displayName}</h3>
                        </div>
                        <div
                          style={{
                            padding: "14px",
                            borderRadius: "8px",
                            border: "1px dashed var(--border-color)",
                            color: "var(--text-muted)",
                            fontSize: "0.86rem",
                          }}
                        >
                          No active peptides for this user.
                        </div>
                      </section>
                    );
                  }

                  return (
                    <section key={user.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: user.color }} />
                          <h3 style={{ fontSize: "1rem", margin: 0 }}>{user.displayName}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate("/vault/add", { state: { vaultUserId: user.id } })}
                          style={{
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.03)",
                            color: "var(--text-secondary)",
                            padding: "6px 9px",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Add Peptide
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {userPeptides.map((peptide) => {
                  const schedule = scheduleByPeptideId.get(peptide.id);
                  const isAdHocOnly = !schedule?.isActive;
                  const peptideLogs = logsByPeptideId.get(peptide.id) || [];

                  // Completing a scheduled dose belongs to the person's dosing plan, not to a
                  // particular vial. A vial can be replaced later on the same day.
                  const loggedDates = new Set(
                    peptideLogs
                      .filter(isCompletedScheduledInjectionLog)
                      .map((l) => l.scheduledDate)
                  );

                  const nextDate = schedule
                    ? getNextScheduledDoseDate(schedule, today, loggedDates)
                    : "";
                  const daysUntilNext = schedule
                    ? getDaysUntilNextScheduledDose(schedule, today, loggedDates)
                    : null;

                  const sharedProjection = sharedProjectionByPeptideId.get(peptide.id) || {
                    injectionCount: 0,
                    emptyDate: null,
                  };
                  const emptyDate = sharedProjection.emptyDate;

                  const daysUntilEmpty =
                    emptyDate && schedule
                      ? Math.round(
                          (parseLocalDate(emptyDate).getTime() - parseLocalDate(today).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : null;

                  const shouldVerifyEfficacy =
                    daysUntilEmpty !== null && daysUntilEmpty > 60 && !peptide.efficacyVerifiedAt;
                  const { remainingMg, percent, remainingMcg } =
                    vialStatusByPeptideId.get(peptide.id) || {
                      remainingMg: peptide.vialMg,
                      percent: 100,
                      remainingMcg: getCurrentVialTotalMcg(peptide),
                    };
                  const stockOptions = getAvailableStockForPeptide(peptide);
                  const scheduledDose =
                    schedule && nextDate
                      ? getScheduledDoseForDate(peptide, schedule, nextDate)
                      : {
                          doseValue: peptide.desiredDoseValue,
                          doseUnit: peptide.desiredDoseUnit,
                        };
                  const refillDoseMcg = normalizeDoseToMcg(scheduledDose.doseValue, scheduledDose.doseUnit);
                  const canPullFromStock =
                    stockOptions.length > 0 && hasLessThanTwoDosesRemaining(remainingMcg, refillDoseMcg);
                  const scheduledDraw = getDrawForDose(
                    peptide,
                    scheduledDose.doseValue,
                    scheduledDose.doseUnit
                  );

                  return (
                    <div
                      key={peptide.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (layoutMode === "desktop") {
                          setSelectedPeptideId(peptide.id);
                          return;
                        }
                        navigate(`/vault/${peptide.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          if (layoutMode === "desktop") {
                            setSelectedPeptideId(peptide.id);
                          } else {
                            navigate(`/vault/${peptide.id}`);
                          }
                        }
                      }}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "14px",
                        background:
                          selectedPeptide?.id === peptide.id
                            ? "rgba(99, 102, 241, 0.12)"
                            : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          width: "100%",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              fontSize: "1.15rem",
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                            }}
                          >
                            {peptide.name}
                          </h3>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            Dose: {formatDose(scheduledDose.doseValue, scheduledDose.doseUnit)}
                          </span>
                          {isAdHocOnly && (
                            <span style={{ display: "block", marginTop: "4px", fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 700 }}>
                              AD-HOC ONLY · NO SCHEDULE
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Remaining vial</span>
                          <strong style={{ fontSize: "1rem" }}>{remainingMg.toFixed(2)} mg ({percent.toFixed(0)}%)</strong>
                        </div>
                      </div>

                      <div
                        style={{
                          height: "4px",
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: "2px",
                          margin: "12px 0",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ height: "100%", width: `${percent}%`, background: percent > 30 ? "var(--gradient-success)" : percent > 10 ? "var(--gradient-warning)" : "var(--gradient-danger)" }} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <span>Draw: <strong style={{ color: "var(--text-primary)" }}>{formatMl(scheduledDraw.drawMl)} / {formatUnits(scheduledDraw.drawUnits)}</strong></span>
                        <span>Next: <strong style={{ color: "var(--text-primary)" }}>{isAdHocOnly ? "Log when taken" : `${getFriendlyDate(nextDate)} ${schedule?.injectionTime || "09:00"}`}</strong></span>
                        <span>Empty in: <strong style={{ color: daysUntilEmpty !== null && (daysUntilEmpty <= 7 || daysUntilEmpty > 60) ? "var(--color-danger)" : "var(--text-primary)" }}>{daysUntilEmpty !== null ? daysUntilEmpty <= 0 ? "Empty" : `${daysUntilEmpty} days` : "N/A"}</strong></span>
                        <span>Status: {daysUntilNext === 0 ? <span className="badge badge-due" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>Due Today</span> : <strong style={{ color: "var(--text-primary)" }}>{isAdHocOnly ? "Ad-hoc" : daysUntilNext !== null ? `In ${daysUntilNext} d` : "Inactive"}</strong>}</span>
                      </div>

                      <SyringeVisualizer
                        drawMl={scheduledDraw.drawMl}
                        syringeSizeMl={peptide.syringeSizeMl}
                        unitsPerMl={peptide.unitsPerMl}
                        displayMode={syringeDisplayMode}
                      />

                      <Button
                        variant="secondary"
                        fullWidth
                        style={{ marginTop: "10px" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          openAdHocModal(peptide);
                        }}
                      >
                        <Plus size={16} />
                        Ad-hoc Injection
                      </Button>

                      {shouldVerifyEfficacy && (
                        <div
                          style={{
                            marginTop: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "6px",
                            color: "var(--color-danger)",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertTriangle size={15} />
                            verify efficacy
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleMarkEfficacyVerified(peptide);
                            }}
                            style={{
                              border: "1px solid rgba(16, 185, 129, 0.5)",
                              background: "rgba(16, 185, 129, 0.08)",
                              color: "var(--color-success)",
                              borderRadius: "var(--border-radius-sm)",
                              padding: "4px 8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Mark Verified
                          </button>
                        </div>
                      )}

                      {canPullFromStock && (
                        <Button
                          variant="success"
                          fullWidth
                          style={{ marginTop: "10px" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            openRefillFromStockModal(peptide, stockOptions);
                          }}
                        >
                          <Package size={16} />
                          Pull From Stock
                        </Button>
                      )}
                    </div>
                  );
                })}
                      </div>
                    </section>
                  );
                })}
          </div>
        </Card>
        </div>

        <aside className="vault-detail-panel">
          {selectedPeptide ? (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem" }}>{selectedPeptide.name}</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem" }}>
                    {formatDose(selectedPeptide.desiredDoseValue, selectedPeptide.desiredDoseUnit)} dose
                  </p>
                </div>
                <Button variant="secondary" onClick={() => navigate(`/vault/${selectedPeptide.id}`)}>
                  Details
                </Button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "14px" }}>
                {(() => {
                  const { remainingMg, percent } =
                    vialStatusByPeptideId.get(selectedPeptide.id) || {
                      remainingMg: selectedPeptide.vialMg,
                      percent: 100,
                      remainingMcg: getCurrentVialTotalMcg(selectedPeptide),
                    };
                  const emptyDate = sharedProjectionByPeptideId.get(selectedPeptide.id)?.emptyDate || null;
                  return (
                    <>
                      <div className="metric-tile">
                        <span>Remaining</span>
                        <strong>{remainingMg.toFixed(2)} mg</strong>
                      </div>
                      <div className="metric-tile">
                        <span>Vial</span>
                        <strong>{percent.toFixed(0)}%</strong>
                      </div>
                      <div className="metric-tile">
                        <span>Empty Date</span>
                        <strong>{emptyDate ? getFriendlyDate(emptyDate) : "N/A"}</strong>
                      </div>
                      <div className="metric-tile">
                        <span>Logs</span>
                        <strong>{selectedPeptideLogs.length}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>

              {(() => {
                const loggedDates = new Set(
                  selectedPeptideLogs
                    .filter(isCompletedScheduledInjectionLog)
                    .map((l) => l.scheduledDate)
                );
                const nextDate = selectedPeptideSchedule
                  ? getNextScheduledDoseDate(selectedPeptideSchedule, today, loggedDates)
                  : "";
                const scheduledDose =
                  selectedPeptideSchedule && nextDate
                    ? getScheduledDoseForDate(selectedPeptide, selectedPeptideSchedule, nextDate)
                    : {
                        doseValue: selectedPeptide.desiredDoseValue,
                        doseUnit: selectedPeptide.desiredDoseUnit,
                      };
                const scheduledDraw = getDrawForDose(
                  selectedPeptide,
                  scheduledDose.doseValue,
                  scheduledDose.doseUnit
                );
                return (
                  <div style={{ marginBottom: "14px" }}>
                    <SyringeVisualizer
                      drawMl={scheduledDraw.drawMl}
                      syringeSizeMl={selectedPeptide.syringeSizeMl}
                      unitsPerMl={selectedPeptide.unitsPerMl}
                      displayMode={syringeDisplayMode}
                    />
                  </div>
                );
              })()}

              {(() => {
                const { remainingMcg } =
                  vialStatusByPeptideId.get(selectedPeptide.id) || {
                    remainingMg: selectedPeptide.vialMg,
                    percent: 100,
                    remainingMcg: getCurrentVialTotalMcg(selectedPeptide),
                  };
                const emptyDate = sharedProjectionByPeptideId.get(selectedPeptide.id)?.emptyDate || null;
                const daysUntilEmpty = emptyDate
                  ? Math.round(
                      (parseLocalDate(emptyDate).getTime() - parseLocalDate(today).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;
                const shouldVerifyEfficacy =
                  daysUntilEmpty !== null && daysUntilEmpty > 60 && !selectedPeptide.efficacyVerifiedAt;
                const stockOptions = getAvailableStockForPeptide(selectedPeptide);
                const schedule = selectedPeptide ? scheduleByPeptideId.get(selectedPeptide.id) : undefined;
                const nextDate = schedule
                  ? getNextScheduledDoseDate(
                      schedule,
                      today,
                      new Set(selectedPeptideLogs.filter(isCompletedScheduledInjectionLog).map((log) => log.scheduledDate))
                    )
                  : "";
                const scheduledDose =
                  schedule && nextDate
                    ? getScheduledDoseForDate(selectedPeptide, schedule, nextDate)
                    : {
                        doseValue: selectedPeptide.desiredDoseValue,
                        doseUnit: selectedPeptide.desiredDoseUnit,
                      };
                const refillDoseMcg = normalizeDoseToMcg(scheduledDose.doseValue, scheduledDose.doseUnit);
                const canPullFromStock =
                  stockOptions.length > 0 && hasLessThanTwoDosesRemaining(remainingMcg, refillDoseMcg);

                if (!shouldVerifyEfficacy && !canPullFromStock) return null;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                    {shouldVerifyEfficacy && (
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => void handleMarkEfficacyVerified(selectedPeptide)}
                      >
                        <CheckCircle2 size={16} />
                        Mark Efficacy Verified
                      </Button>
                    )}
                    {canPullFromStock && (
                      <Button
                        variant="success"
                        fullWidth
                        onClick={() => openRefillFromStockModal(selectedPeptide, stockOptions)}
                      >
                        <Package size={16} />
                        Pull From Stock
                      </Button>
                    )}
                  </div>
                );
              })()}

              <Button variant="success" fullWidth onClick={() => navigate(`/vault/${selectedPeptide.id}`)}>
                Log or Edit
              </Button>
              <Button variant="secondary" fullWidth style={{ marginTop: "10px" }} onClick={() => openAdHocModal(selectedPeptide)}>
                <Plus size={16} />
                Ad-hoc Injection
              </Button>
            </Card>
          ) : (
            <Card>
              <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
                Select an open vial to view details.
              </p>
            </Card>
          )}
        </aside>
      </div>

      {penSource && createPortal(
        <div className="modal-overlay" onClick={closePenModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Create Reusable Pen</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "5px" }}>Fill a pen from {penSource.peptide.name}. The vial and pen will keep separate balances.</p>
              </div>
              <button type="button" onClick={closePenModal} aria-label="Close create pen" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <Input label="Pen name" value={penName} onChange={(event) => setPenName(event.target.value)} required />
              <Input label={`Transfer from vial (up to ${(penSource.remainingMg / penSource.peptide.concentrationMgPerMl).toFixed(2)} mL)`} type="number" inputMode="decimal" min="0.001" max={penSource.remainingMg / penSource.peptide.concentrationMgPerMl} step="any" value={penTransferMl} onChange={(event) => setPenTransferMl(event.target.value)} suffix="mL" required />
              <button type="button" onClick={() => setPenTransferMl((penSource.remainingMg / penSource.peptide.concentrationMgPerMl).toFixed(4))} style={{ alignSelf: "flex-start", marginTop: "-8px", background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontWeight: 700, padding: 0 }}>Use entire remaining vial</button>
              <Input label="Additional BAC in pen (optional)" type="number" inputMode="decimal" min="0" step="any" value={penExtraBacMl} onChange={(event) => setPenExtraBacMl(event.target.value)} suffix="mL" />
              <div style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
                <strong style={{ fontSize: "0.88rem" }}>Users who can use this pen</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginTop: "10px" }}>
                  {visibleVaultUsers.map((user) => (
                    <label key={user.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={penUserIds.includes(user.id)} onChange={() => setPenUserIds((ids) => ids.includes(user.id) ? ids.filter((id) => id !== user.id) : [...ids, user.id])} />
                      {user.displayName}
                    </label>
                  ))}
                </div>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.45, margin: 0 }}>Extra BAC changes the pen’s concentration only. The source vial keeps its original concentration.</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <Button type="button" variant="secondary" fullWidth onClick={closePenModal}>Cancel</Button>
                <Button type="button" variant="primary" fullWidth onClick={() => void createPenFromVial()}>Create Pen</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {adHocPeptide &&
        createPortal(
          <div className="modal-overlay" onClick={closeAdHocModal}>
            <div
              className="modal-content"
              onClick={(event) => event.stopPropagation()}
              style={{ maxWidth: "480px", width: "min(480px, calc(100vw - 32px))" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Ad-hoc Injection</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                    {adHocPeptide.name} • standalone dose from this open vial
                  </p>
                </div>
                <button type="button" onClick={closeAdHocModal} aria-label="Close ad-hoc injection" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAdHocInjection} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="form-row-grid">
                  <Input
                    label="Dose"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={adHocDose}
                    onChange={(event) => setAdHocDose(event.target.value)}
                    required
                    autoFocus
                  />
                  <Select
                    label="Unit"
                    value={adHocUnit}
                    onChange={(event) => setAdHocUnit(event.target.value as DoseUnit)}
                    options={[{ value: "mg", label: "mg" }, { value: "mcg", label: "mcg" }]}
                  />
                </div>
                <div className="form-row-grid">
                  <Input label="Date" type="date" value={adHocDate} onChange={(event) => setAdHocDate(event.target.value)} required />
                  <Input label="Time" type="time" value={adHocTime} onChange={(event) => setAdHocTime(event.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="ad-hoc-injection-notes" className="form-label">Notes (optional)</label>
                  <textarea
                    id="ad-hoc-injection-notes"
                    className="form-control"
                    style={{ minHeight: "64px", resize: "vertical" }}
                    placeholder="Optional context for this dose"
                    value={adHocNotes}
                    onChange={(event) => setAdHocNotes(event.target.value)}
                  />
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
                  This reduces the vial balance but does not change the dosing schedule.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button type="button" variant="secondary" fullWidth onClick={closeAdHocModal}>Cancel</Button>
                  <Button type="submit" variant="primary" fullWidth>Save Injection</Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {pendingBackdatedAdHoc && adHocPeptide &&
        createPortal(
          <div className="modal-overlay" onClick={() => setPendingBackdatedAdHoc(null)}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>This dose predates the open vial</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                This vial is recorded as opened on {pendingBackdatedAdHoc.openedDate}. Choose whether the dose came from this vial or should be reconciled later.
              </p>
              <div style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
                <Button type="button" variant="primary" onClick={() => void saveAdHocInjection("assigned")}>
                  Apply to this open vial
                </Button>
                <Button type="button" variant="secondary" onClick={() => void saveAdHocInjection("unassigned")}>
                  Record without assigning a vial
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPendingBackdatedAdHoc(null)}>
                  Go back
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {refillRequest && (
        <RefillFromStockModal
          peptide={refillRequest.peptide}
          stockOptions={refillRequest.stockOptions}
          onClose={closeRefillModal}
          onConfirm={handleConfirmRefillFromStock}
        />
      )}

      {bacWaterHistoryVial && createPortal(
        <div className="modal-overlay" onClick={closeBacWaterHistory}>
          <div className="modal-content" style={{ maxWidth: "560px", maxHeight: "80vh", overflowY: "auto" }} onClick={(event) => event.stopPropagation()}>
            <div className="stock-modal-header">
              <div><h2 style={{ margin: 0 }}>BAC Water Use History</h2><p style={{ margin: "5px 0 0", color: "var(--text-secondary)", fontSize: "0.84rem" }}>{bacWaterHistoryVial.name} · {bacWaterHistoryVial.uses.length} recorded uses</p></div>
              <button type="button" onClick={closeBacWaterHistory} aria-label="Close use history" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
              {bacWaterHistoryVial.uses.length > 0 ? bacWaterHistoryVial.uses.slice().reverse().map((use) => <div key={use.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.02)", fontSize: "0.84rem" }}><div><strong>{formatMl(use.amountMl)}</strong> · {use.purpose}{use.notes ? ` · ${use.notes}` : ""}<br /><span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>{new Date(use.usedAt).toLocaleString()}</span></div><div style={{ display: "flex", gap: "4px" }}><button type="button" onClick={() => { closeBacWaterHistory(); openBacWaterUseModal(bacWaterHistoryVial, use.id); }} aria-label="Edit BAC water use" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}><Edit2 size={16} /></button><button type="button" onClick={() => handleDeleteBacWaterUse(bacWaterHistoryVial, use.id)} aria-label="Remove BAC water use" style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "4px" }}><Trash2 size={16} /></button></div></div>) : <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>No uses recorded yet.</p>}
            </div>
          </div>
        </div>, document.body
      )}

      {bacWaterAction && createPortal(
        <div className="modal-overlay" onClick={closeBacWaterModal}>
          <div className="modal-content" style={{ maxWidth: "460px" }} onClick={(event) => event.stopPropagation()}>
            <div className="stock-modal-header">
              <div>
                <h2 style={{ margin: 0 }}>{bacWaterAction === "addStock" ? "Add BAC Water Stock" : bacWaterAction === "open" ? "Open BAC Water Vial" : editingBacWaterUseId ? "Edit BAC Water Use" : "Record BAC Water Use"}</h2>
                <p style={{ margin: "5px 0 0", color: "var(--text-secondary)", fontSize: "0.84rem" }}>{bacWaterAction === "addStock" ? "Keep multiple vial sizes and quantities on hand." : bacWaterAction === "open" ? openBacWaterVials.length ? "Add this vial's volume to the active BAC water supply." : "Start tracking the active BAC water supply." : `${selectedBacWaterVial ? formatMl(selectedBacWaterVial.remainingMl) : ""} available`}</p>
              </div>
              <button type="button" onClick={closeBacWaterModal} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveBacWater} className="stock-modal-form">
              <div className="stock-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {bacWaterAction === "addStock" ? <>
                  <Input label="Vial name" value={bacWaterName} onChange={(event) => setBacWaterName(event.target.value)} placeholder="BAC Water" />
                  <div className="form-row-grid">
                    <Input label="Vial size (mL)" type="number" inputMode="decimal" min="0" step="0.01" value={bacWaterTotalMl} onChange={(event) => setBacWaterTotalMl(event.target.value)} placeholder="e.g. 10" required />
                    <Input label="Vials purchased" type="number" inputMode="numeric" min="1" step="1" value={bacWaterVialCount} onChange={(event) => setBacWaterVialCount(event.target.value)} placeholder="e.g. 3" required />
                  </div>
                </> : bacWaterAction === "open" ? <>
                  <Input label="Vial name" value={bacWaterName} onChange={(event) => setBacWaterName(event.target.value)} placeholder="BAC Water" />
                  <Input label="Starting volume (mL)" type="number" inputMode="decimal" min="0" step="0.01" value={bacWaterTotalMl} onChange={(event) => setBacWaterTotalMl(event.target.value)} placeholder="e.g. 10" required />
                </> : <>
                  <div className="form-row-grid">
                    <Input label={`Amount (${bacWaterUseUnit})`} type="number" inputMode="decimal" min="0" step="0.01" value={bacWaterUseAmount} onChange={(event) => setBacWaterUseAmount(event.target.value)} placeholder={bacWaterUseUnit === "mL" ? "e.g. 2" : "e.g. 200"} required />
                    <Select label="Unit" value={bacWaterUseUnit} onChange={(event) => setBacWaterUseUnit(event.target.value as "mL" | "units")} options={[{ value: "mL", label: "mL" }, { value: "units", label: "Units" }]} />
                  </div>
                  <Select label="Use" value={bacWaterUsePurpose} onChange={(event) => setBacWaterUsePurpose(event.target.value as BacWaterUsePurpose)} options={[{ value: "reconstitution", label: "Reconstitute" }, { value: "dilution", label: "Dilute injection" }, { value: "other", label: "Other" }]} />
                </>}
                <div className="form-group"><label className="form-label" htmlFor="bac-water-notes">Notes</label><textarea id="bac-water-notes" className="form-control" value={bacWaterNotes} onChange={(event) => setBacWaterNotes(event.target.value)} placeholder="Optional" rows={3} style={{ resize: "vertical" }} /></div>
              </div>
              <div className="stock-modal-actions"><Button variant="secondary" fullWidth onClick={closeBacWaterModal}>Cancel</Button><Button variant="primary" fullWidth type="submit">{bacWaterAction === "addStock" ? "Add Stock" : bacWaterAction === "open" ? "Open Vial" : editingBacWaterUseId ? "Save Changes" : "Save Use"}</Button></div>
            </form>
          </div>
        </div>, document.body
      )}

      {isStockModalOpen &&
        createPortal(
          (
        <div
          className="modal-overlay stock-modal-overlay"
          onClick={closeStockModal}
          style={{
            alignItems: "flex-start",
            overflowY: "auto",
            padding: "12px",
          }}
        >
          <div className="modal-content stock-modal-content" onClick={(event) => event.stopPropagation()}>
            <div
              className="stock-modal-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <h3 style={{ fontSize: "1.15rem" }}>
                {editingStockItemId ? "Edit Purchase Lot" : "Add Purchase Lot"}
              </h3>
              <button
                onClick={closeStockModal}
                aria-label="Close stock form"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStockItem} className="stock-modal-form">
              <div className="stock-modal-body">
                <Input
                  label="Peptide Name"
                  value={stockName}
                  onChange={(event) => setStockName(event.target.value)}
                  placeholder="e.g. Retatrutide"
                  list="stock-peptides-list"
                  required
                />
                <datalist id="stock-peptides-list">
                  {PRELOADED_PEPTIDES.map((peptideName) => (
                    <option key={peptideName} value={peptideName} />
                  ))}
                </datalist>

                <div className="form-row-grid">
                  <Input
                    label="Mg Per Vial"
                    type="number"
                    inputMode="decimal"
                    value={stockMgPerVial}
                    onChange={(event) => setStockMgPerVial(event.target.value)}
                    placeholder="e.g. 10"
                    suffix="mg"
                  />
                  <Input
                    label={editingStockItemId ? "Originally Purchased" : "Vials Purchased"}
                    type="number"
                    inputMode="numeric"
                    value={stockPurchasedVialCount}
                    onChange={(event) => {
                      setStockPurchasedVialCount(event.target.value);
                      if (!editingStockItemId) setStockNumberOfVials(event.target.value);
                    }}
                    placeholder="e.g. 5"
                    required={!editingStockItemId}
                  />
                </div>

                {editingStockItemId && (
                  <Input
                    label="Vials Remaining"
                    type="number"
                    inputMode="numeric"
                    value={stockNumberOfVials}
                    onChange={(event) => setStockNumberOfVials(event.target.value)}
                    placeholder="e.g. 4"
                  />
                )}

              <div className="form-row-grid">
                <Input
                  label="Batch Number"
                  value={stockBatchNumber}
                  onChange={(event) => setStockBatchNumber(event.target.value)}
                  placeholder="Optional"
                />
                <Input
                  label="Manufacturer Date"
                  type="date"
                  value={stockManufacturerDate}
                  onChange={(event) => setStockManufacturerDate(event.target.value)}
                />
              </div>

              <div className="form-row-grid">
                <Input
                  label="Ordered Date"
                  type="date"
                  value={stockOrderedDate}
                  onChange={(event) => setStockOrderedDate(event.target.value)}
                />
                <Input
                  label="Delivered Date"
                  type="date"
                  value={stockReceivedDate}
                  onChange={(event) => setStockReceivedDate(event.target.value)}
                />
              </div>

              <div className="form-row-grid">
                <Input
                  label="Supplier"
                  value={stockSupplier}
                  onChange={(event) => setStockSupplier(event.target.value)}
                  placeholder="Optional"
                />
                <Input
                  label="Total Purchase Price"
                  type="number"
                  inputMode="decimal"
                  value={stockPrice}
                  onChange={(event) => setStockPrice(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <Input
                label="Stored Location"
                value={stockStoredLocation}
                onChange={(event) => setStockStoredLocation(event.target.value)}
                placeholder="e.g. Freezer drawer 2"
              />

              <div className="form-group">
                <label htmlFor="stock-notes" className="form-label">
                  Notes
                </label>
                <textarea
                  id="stock-notes"
                  className="form-control"
                  value={stockNotes}
                  onChange={(event) => setStockNotes(event.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock-coa" className="form-label">
                  COA Upload
                </label>
                <label
                  htmlFor="stock-coa"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    border: "1px dashed var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={17} style={{ color: "var(--color-primary)" }} />
                  <span style={{ fontSize: "0.86rem" }}>
                    {stockCoaFile ? stockCoaFile.name : "Upload COA file if available"}
                  </span>
                </label>
                <input
                  id="stock-coa"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => setStockCoaFile(event.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
              </div>

              </div>

              <div className="stock-modal-actions">
                <Button variant="secondary" fullWidth onClick={closeStockModal}>
                  Cancel
                </Button>
                <Button variant="primary" fullWidth type="submit">
                  {editingStockItemId ? "Save Purchase" : "Add Purchase"}
                </Button>
              </div>
            </form>
          </div>
        </div>
          ),
          document.body
        )}
    </div>
  );
};
