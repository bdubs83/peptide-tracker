import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { createVaultUser, ensureDefaultVaultUser, renameVaultUser } from "../../db/vaultUsers";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
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
} from "../../utils/dateUtils";
import { formatMl, formatUnits, formatDose } from "../../utils/formatting";
import { calculateReconstitution, normalizeDoseToMcg } from "../calculator/calculatorUtils";
import { PRELOADED_PEPTIDES } from "../../utils/peptideList";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dna,
  Edit2,
  FileText,
  Package,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { InjectionLog } from "../../types/injectionLog";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { StockItem } from "../../types/stock";
import { DEFAULT_VAULT_USER_ID } from "../../types/vaultUser";

const normalizePeptideName = (name: string) => name.trim().toLowerCase();

type RefillRequest = {
  peptide: Peptide;
  stockOptions: StockItem[];
};

type VialStatus = {
  remainingMg: number;
  percent: number;
  remainingMcg: number;
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

export const VaultPage: React.FC = () => {
  const navigate = useNavigate();
  const layoutMode = useEffectiveLayoutMode();
  const today = useMemo(() => getLocalDateString(), []);

  const peptides = useLiveQuery(() => db.peptides.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray());
  const logs = useLiveQuery(() => db.injectionLogs.toArray());
  const stockItems = useLiveQuery(() => db.stockItems.orderBy("createdAt").reverse().toArray());
  const vaultUsers = useLiveQuery(async () => {
    await ensureDefaultVaultUser();
    return db.vaultUsers.orderBy("sortOrder").toArray();
  });
  const settings = useLiveQuery(() => db.appSettings.toArray());
  const syringeDisplayMode = settings?.find((item) => item.key === "pref_displayMode")?.value === "mL" ? "mL" : "units";

  const [isStockOpen, setIsStockOpen] = useState(true);
  const [isOpenVialsOpen, setIsOpenVialsOpen] = useState(true);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingStockItemId, setEditingStockItemId] = useState<string | null>(null);
  const [stockName, setStockName] = useState("");
  const [stockMgPerVial, setStockMgPerVial] = useState("");
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
  const [selectedRefillStockId, setSelectedRefillStockId] = useState<string | null>(null);

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  const resetStockForm = () => {
    setEditingStockItemId(null);
    setStockName("");
    setStockMgPerVial("");
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

    const now = new Date().toISOString();
    let coaDataUrl: string | undefined;

    if (stockCoaFile) {
      coaDataUrl = await fileToDataUrl(stockCoaFile);
    }

    const existingItem = editingStockItemId ? await db.stockItems.get(editingStockItemId) : null;
    const item: StockItem = {
      id: existingItem?.id || crypto.randomUUID(),
      name: stockName.trim(),
      mgPerVial: stockMgPerVial.trim() || undefined,
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
    await db.stockItems.delete(id);
  };

  const closeRefillModal = () => {
    setRefillRequest(null);
    setSelectedRefillStockId(null);
  };

  const openRefillFromStockModal = (peptide: Peptide, options: StockItem[]) => {
    setRefillRequest({ peptide, stockOptions: options });
    setSelectedRefillStockId(options.length === 1 ? options[0].id : null);
  };

  const handleConfirmRefillFromStock = async () => {
    if (!refillRequest || !selectedRefillStockId) return;

    const stockItem = refillRequest.stockOptions.find((item) => item.id === selectedRefillStockId);
    if (!stockItem) return;

    const mgPerVial = stockItem.mgPerVial ? Number(stockItem.mgPerVial) : NaN;
    const vialCount = stockItem.numberOfVials ? Number(stockItem.numberOfVials) : NaN;
    if (!Number.isFinite(mgPerVial) || mgPerVial <= 0 || !Number.isFinite(vialCount) || vialCount <= 0) {
      alert("This stock item does not have an available vial to pull.");
      return;
    }

    const nowIso = new Date().toISOString();
    const newOpenVialId = crypto.randomUUID();
    const recalculated = calculateReconstitution({
      peptideMg: mgPerVial,
      bacWaterMl: refillRequest.peptide.bacWaterMl,
      desiredDoseValue: refillRequest.peptide.desiredDoseValue,
      desiredDoseUnit: refillRequest.peptide.desiredDoseUnit,
      unitsPerMl: refillRequest.peptide.unitsPerMl,
    });

    await db.transaction("rw", [db.peptides, db.stockItems], async () => {
      await db.peptides.update(refillRequest.peptide.id, {
        vialMg: mgPerVial,
        concentrationMgPerMl: recalculated.concentrationMgPerMl,
        concentrationMcgPerMl: recalculated.concentrationMcgPerMl,
        doseMl: recalculated.doseMl,
        doseUnits: recalculated.doseUnits,
        estimatedDosesPerVial: recalculated.estimatedDosesPerVial,
        percentOfVialPerDose: recalculated.percentOfVialPerDose,
        currentVialStartedAt: nowIso,
        openVialId: newOpenVialId,
        efficacyVerifiedAt: undefined,
        sourceStockItemId: stockItem.id,
        updatedAt: nowIso,
      });
      await db.stockItems.update(stockItem.id, {
        numberOfVials: String(Math.max(0, Math.floor(vialCount) - 1)),
        updatedAt: nowIso,
      });
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

  const getStockTotalMg = (item: StockItem) => {
    const mgPerVial = item.mgPerVial ? Number(item.mgPerVial) : NaN;
    const vialCount = item.numberOfVials ? Number(item.numberOfVials) : NaN;
    if (!Number.isFinite(mgPerVial) || mgPerVial <= 0) return null;
    if (!Number.isFinite(vialCount) || vialCount <= 0) return null;
    return mgPerVial * vialCount;
  };

  const peptideById = useMemo(
    () => new Map((peptides || []).map((peptide) => [peptide.id, peptide])),
    [peptides]
  );

  const scheduleByPeptideId = useMemo(
    () => new Map((schedules || []).map((schedule) => [schedule.peptideId, schedule])),
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

  const availableStockByPeptideId = useMemo(() => {
    const map = new Map<string, StockItem[]>();
    for (const peptide of peptides || []) {
      const options = (stockItemsByName.get(normalizePeptideName(peptide.name)) || []).filter((item) => {
        const vialCount = item.numberOfVials ? Number(item.numberOfVials) : NaN;
        const mgPerVial = item.mgPerVial ? Number(item.mgPerVial) : NaN;
        return (
          Number.isFinite(vialCount) &&
          vialCount > 0 &&
          Number.isFinite(mgPerVial) &&
          mgPerVial > 0
        );
      });
      map.set(peptide.id, options);
    }
    return map;
  }, [peptides, stockItemsByName]);

  const getAvailableStockForPeptide = (peptide: Peptide) => {
    return availableStockByPeptideId.get(peptide.id) || [];
  };

  const currentVialLogsByPeptideId = useMemo(() => {
    const map = new Map<string, InjectionLog[]>();
    const allLogs = logs || [];
    for (const peptide of peptides || []) {
      map.set(peptide.id, getCurrentVialLogs(peptide, allLogs));
    }
    return map;
  }, [logs, peptides]);

  const logsByPeptideId = useMemo(() => {
    const map = new Map<string, InjectionLog[]>();
    for (const log of logs || []) {
      map.set(log.peptideId, [...(map.get(log.peptideId) || []), log]);
    }
    return map;
  }, [logs]);

  const vialStatusByPeptideId = useMemo(() => {
    const map = new Map<string, VialStatus>();
    for (const peptide of peptides || []) {
      const currentVialLogs = currentVialLogsByPeptideId.get(peptide.id) || [];
      const takenMcg = currentVialLogs
        .filter((log) => log.status === "taken" || log.status === "manual")
        .reduce((sum, log) => sum + normalizeDoseToMcg(log.doseValue, log.doseUnit), 0);

      const totalMcg = peptide.vialMg * 1000;
      const remainingMcg = Math.max(0, totalMcg - takenMcg);
      map.set(peptide.id, {
        remainingMg: remainingMcg / 1000,
        percent: totalMcg > 0 ? (remainingMcg / totalMcg) * 100 : 0,
        remainingMcg,
      });
    }
    return map;
  }, [currentVialLogsByPeptideId, peptides]);

  const sharedProjectionByPeptideId = useMemo(() => {
    const map = new Map<string, { injectionCount: number; emptyDate: string | null }>();
    if (!peptides || !schedules || !logs) return map;

    for (const peptide of peptides) {
      map.set(peptide.id, getSharedOpenVialProjection(peptide, peptides, schedules, logs, today));
    }
    return map;
  }, [logs, peptides, schedules, today]);

  const stockProjectionById = useMemo(() => {
    const map = new Map<string, StockProjection>();
    if (!stockItems || !peptides || !schedules) return map;

    const activeSchedulesByName = new Map<string, PeptideSchedule[]>();
    for (const schedule of schedules) {
      if (!schedule.isActive) continue;
      const peptide = peptideById.get(schedule.peptideId);
      if (!peptide) continue;
      const key = normalizePeptideName(peptide.name);
      activeSchedulesByName.set(key, [...(activeSchedulesByName.get(key) || []), schedule]);
    }

    for (const item of stockItems) {
      const mgPerVial = item.mgPerVial ? Number(item.mgPerVial) : NaN;
      const vialCount = item.numberOfVials ? Number(item.numberOfVials) : NaN;
      if (!Number.isFinite(mgPerVial) || mgPerVial <= 0) continue;
      if (!Number.isFinite(vialCount) || vialCount <= 0) continue;

      const normalizedStockName = normalizePeptideName(item.name);
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
          map.set(item.id, {
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
        id: `stock-${item.id}`,
        openVialId: `stock-${item.id}`,
        vialMg: mgPerVial * vialCount,
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

      map.set(item.id, {
        sourceName: match.name,
        injectionCount: projection.injectionCount,
        emptyDate,
        daysUntilEmpty,
        scheduleLabel: `Using ${matchingSchedules.length} active dosing schedule${matchingSchedules.length === 1 ? "" : "s"}`,
      });
    }

    return map;
  }, [peptideById, peptides, peptidesByName, scheduleByPeptideId, schedules, stockItems, today]);

  const openVialCount = peptides?.length || 0;
  const stockCount = stockItems?.length || 0;
  const visibleVaultUsers = useMemo(
    () => vaultUsers?.filter((user) => !user.isArchived) || [],
    [vaultUsers]
  );
  const peptidesByUserId = useMemo(() => {
    const map = new Map<string, Peptide[]>();
    for (const peptide of peptides || []) {
      const userId = peptide.vaultUserId || DEFAULT_VAULT_USER_ID;
      map.set(userId, [...(map.get(userId) || []), peptide]);
    }
    return map;
  }, [peptides]);
  const selectedPeptide =
    (selectedPeptideId ? peptideById.get(selectedPeptideId) : undefined) || peptides?.[0] || null;
  const selectedPeptideLogs =
    selectedPeptide ? logsByPeptideId.get(selectedPeptide.id) || [] : [];
  const selectedCurrentVialLogs =
    selectedPeptide ? currentVialLogsByPeptideId.get(selectedPeptide.id) || [] : [];
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
              onClick={() => setIsStockOpen((value) => !value)}
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
              Add
            </Button>
          </div>

          {!isStockOpen && stockItems && stockItems.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              {stockItems.map((item) => {
                const stockProjection = stockProjectionById.get(item.id);
                const totalStockMg = getStockTotalMg(item);
                const daysLabel =
                  stockProjection?.daysUntilEmpty !== null &&
                  stockProjection?.daysUntilEmpty !== undefined
                    ? `${stockProjection.daysUntilEmpty} days`
                    : "No active schedule";

                return (
                  <div
                    key={`collapsed-${item.id}`}
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
                      {item.name}
                    </span>
                    <span style={{ color: "var(--text-secondary)", textAlign: "right" }}>
                      {totalStockMg !== null ? `${Number(totalStockMg.toFixed(2))} mg` : "Unknown mg"} - {daysLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isStockOpen && (
            <div className="vault-stock-grid" style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {stockItems && stockItems.length > 0 ? (
                stockItems.map((item) => {
                  const parsedVials = item.numberOfVials ? parseInt(item.numberOfVials, 10) : NaN;
                  const isOutOfStock = !isNaN(parsedVials) && parsedVials <= 0;
                  const stockProjection = stockProjectionById.get(item.id);

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "12px",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <div>
                        <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>{item.name}</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {item.mgPerVial && (
                            <span className="badge">{item.mgPerVial} mg/vial</span>
                          )}
                          {item.numberOfVials && <span className="badge">{item.numberOfVials} vials</span>}
                          {item.batchNumber && <span className="badge">Batch {item.batchNumber}</span>}
                          {item.supplier && <span className="badge">{item.supplier}</span>}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px", alignSelf: "flex-start" }}>
                        <button
                          onClick={() => openEditStockModal(item)}
                          aria-label={`Edit ${item.name}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteStockItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-danger)",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                        marginTop: "10px",
                      }}
                    >
                      <span>Manufactured: {item.manufacturerDate || "N/A"}</span>
                      <span>Ordered: {item.orderedDate || "N/A"}</span>
                      <span>Delivered: {item.receivedDate || "N/A"}</span>
                      <span>Price: {item.price || "N/A"}</span>
                      <span>Stored: {item.storedLocation || "N/A"}</span>
                    </div>

                    {item.notes && (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "10px" }}>
                        Notes: {item.notes}
                      </p>
                    )}

                    {stockProjection && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
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

                    {item.coaDataUrl && (
                      <a
                        href={item.coaDataUrl}
                        download={item.coaFileName || `${item.name}-coa`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "10px",
                          fontSize: "0.82rem",
                          color: "var(--color-primary)",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        <FileText size={15} />
                        {item.coaFileName || "Download COA"}
                      </a>
                    )}

                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => handleOpenVialFromStock(item)}
                      disabled={isOutOfStock}
                      style={{ marginTop: "12px" }}
                    >
                      <Dna size={16} />
                      {isOutOfStock ? "No Vials Available" : "Add Peptide From Stock"}
                    </Button>
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
            onClick={() => setIsOpenVialsOpen((value) => !value)}
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
              <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Open Vials</h2>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Active vials, next dose, and empty-date estimates
              </span>
            </div>
            {isOpenVialsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {isOpenVialsOpen && (
            <div className="vault-vial-grid" style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
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
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>No Open Vials</h3>
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
                  const currentVialLogs = currentVialLogsByPeptideId.get(peptide.id) || [];

                  const loggedDates = new Set(
                    currentVialLogs
                      .filter((l) => l.status !== "scheduled")
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
                  const { remainingMg, percent } =
                    vialStatusByPeptideId.get(peptide.id) || {
                      remainingMg: peptide.vialMg,
                      percent: 100,
                      remainingMcg: peptide.vialMg * 1000,
                    };
                  const stockOptions = getAvailableStockForPeptide(peptide);
                  const canPullFromStock = remainingMg <= 0 && stockOptions.length > 0;
                  const scheduledDose =
                    schedule && nextDate
                      ? getScheduledDoseForDate(peptide, schedule, nextDate)
                      : {
                          doseValue: peptide.desiredDoseValue,
                          doseUnit: peptide.desiredDoseUnit,
                        };
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
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              display: "block",
                              marginBottom: "4px",
                            }}
                          >
                            Remaining Vial
                          </span>
                          <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                            {remainingMg.toFixed(2)} mg ({percent.toFixed(0)}%)
                          </span>
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
                        <div
                          style={{
                            height: "100%",
                            width: `${percent}%`,
                            background:
                              percent > 30
                                ? "var(--gradient-success)"
                                : percent > 10
                                ? "var(--gradient-warning)"
                                : "var(--gradient-danger)",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginTop: "8px",
                        }}
                      >
                        <div>
                          Draw:{" "}
                          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            {formatMl(scheduledDraw.drawMl)} / {formatUnits(scheduledDraw.drawUnits)}
                          </span>
                        </div>

                        <div>
                          Next:{" "}
                          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            {getFriendlyDate(nextDate)} {schedule?.injectionTime || "09:00"}
                          </span>
                        </div>

                        <div>
                          Empty in:{" "}
                          <span
                            style={{
                              color:
                                daysUntilEmpty !== null &&
                                (daysUntilEmpty <= 7 || daysUntilEmpty > 60)
                                  ? "var(--color-danger)"
                                  : "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {daysUntilEmpty !== null
                              ? daysUntilEmpty <= 0
                                ? "Empty"
                                : `${daysUntilEmpty} days`
                              : "N/A"}
                          </span>
                        </div>

                        <div>
                          Status:{" "}
                          {daysUntilNext === 0 ? (
                            <span className="badge badge-due" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>
                              Due Today
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                              {daysUntilNext !== null ? `In ${daysUntilNext} d` : "Inactive"}
                            </span>
                          )}
                        </div>
                      </div>

                      <SyringeVisualizer
                        drawMl={scheduledDraw.drawMl}
                        syringeSizeMl={peptide.syringeSizeMl}
                        unitsPerMl={peptide.unitsPerMl}
                        displayMode={syringeDisplayMode}
                      />

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
          )}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                {(() => {
                  const { remainingMg, percent } =
                    vialStatusByPeptideId.get(selectedPeptide.id) || {
                      remainingMg: selectedPeptide.vialMg,
                      percent: 100,
                      remainingMcg: selectedPeptide.vialMg * 1000,
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
                  selectedCurrentVialLogs
                    .filter((l) => l.status !== "scheduled")
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
                const { remainingMg } =
                  vialStatusByPeptideId.get(selectedPeptide.id) || {
                    remainingMg: selectedPeptide.vialMg,
                    percent: 100,
                    remainingMcg: selectedPeptide.vialMg * 1000,
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
                const canPullFromStock = remainingMg <= 0 && stockOptions.length > 0;

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

      {refillRequest && (
        <div
          className="modal-overlay"
          onClick={closeRefillModal}
          style={{
            alignItems: "flex-start",
            overflowY: "auto",
            padding: "12px",
          }}
        >
          <div
            className="modal-content stock-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="stock-modal-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.15rem" }}>Pull From Stock</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginTop: "4px" }}>
                  {refillRequest.peptide.name}
                </p>
              </div>
              <button
                onClick={closeRefillModal}
                aria-label="Close refill popup"
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

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {refillRequest.stockOptions.map((item) => {
                const selected = selectedRefillStockId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRefillStockId(item.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: selected ? "1px solid var(--color-primary)" : "1px solid var(--border-color)",
                      borderRadius: "8px",
                      background: selected ? "rgba(99, 102, 241, 0.12)" : "rgba(255,255,255,0.02)",
                      color: "var(--text-primary)",
                      padding: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <strong>{item.mgPerVial || "Unknown"} mg vial</strong>
                      <span className="badge">{item.numberOfVials || "0"} in stock</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "6px" }}>
                      {item.batchNumber ? `Batch ${item.batchNumber}` : "No batch listed"}
                      {item.supplier ? ` • ${item.supplier}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(245, 158, 11, 0.38)",
                background: "rgba(245, 158, 11, 0.08)",
                color: "var(--text-secondary)",
                fontSize: "0.86rem",
                lineHeight: 1.5,
              }}
            >
              Verify this vial is reconstituted the same as the existing vial:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {refillRequest.peptide.bacWaterMl} mL bac water
              </strong>
              . The app will keep the same dose schedule and recalculate the draw amount from the selected vial mg.
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <Button variant="secondary" fullWidth onClick={closeRefillModal}>
                Cancel
              </Button>
              <Button
                variant="success"
                fullWidth
                onClick={handleConfirmRefillFromStock}
                disabled={!selectedRefillStockId}
              >
                Yes, Same Reconstitution
              </Button>
            </div>
          </div>
        </div>
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
                {editingStockItemId ? "Edit Stock Product" : "Add Stock Product"}
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
                    label="Number of Vials"
                    type="number"
                    inputMode="numeric"
                    value={stockNumberOfVials}
                    onChange={(event) => setStockNumberOfVials(event.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>

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
                  label="Price"
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
                  {editingStockItemId ? "Save Stock" : "Add Stock"}
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
