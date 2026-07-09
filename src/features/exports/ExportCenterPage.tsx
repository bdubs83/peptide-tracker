import React, { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { jsPDF } from "jspdf";
import { ArrowLeft, Check, Download, FileDown, FileText, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { db } from "../../db/db";
import { activeRecords } from "../../db/activeRecords";
import { ensureDefaultVaultUser } from "../../db/vaultUsers";
import type { InjectionLog } from "../../types/injectionLog";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { StockItem } from "../../types/stock";
import { DEFAULT_VAULT_USER_ID, type VaultUser } from "../../types/vaultUser";
import type { WeightLog } from "../../types/weightLog";
import { PEPTIDE_CATALOG } from "../../utils/peptideCatalog";
import { getBlendDefinitionForCatalogId, getBlendDefinitionForName } from "../../utils/blendDefinitions";
import { exportFile, textToBlob } from "../../utils/fileExport";
import {
  addDays,
  getLocalDateString,
  getScheduledDoseForDate,
  getUpcomingInjectionDates,
  hasDoseSchedule,
} from "../../utils/dateUtils";
import { formatDose, formatMl, formatUnits } from "../../utils/formatting";
import { makePreferredScheduleMap } from "../../utils/scheduleUtils";

type ReportSectionKey =
  | "stockItems"
  | "openVials"
  | "stackSummary"
  | "scheduleSummary"
  | "scheduleByDate"
  | "history"
  | "halfLifeInputs"
  | "halfLifeSummary";
type LogStatus = InjectionLog["status"];
type PdfTableSection = {
  title?: string;
  headers: string[];
  rows: string[][];
  columnWeights?: number[];
};
type HalfLifeCurveInput = {
  label: string;
  halfLifeHours: number;
  events: Array<{ date: string; doseMg: number }>;
};
type HalfLifeInfo = {
  hours: number;
  source: string;
};
type HalfLifeReportRow = {
  peptide: Peptide;
  schedule: PeptideSchedule;
  label: string;
  halfLife: HalfLifeInfo;
  dates: string[];
  doseMultiplier: number;
};

const reportSectionOptions: Array<{ value: ReportSectionKey; label: string; description: string }> = [
  { value: "stockItems", label: "Vault Stock", description: "Unopened inventory and stock item details." },
  { value: "openVials", label: "Open Vials", description: "Current open vials, source, next dose, and draw." },
  { value: "stackSummary", label: "Stack Summary", description: "Selected active stack items and recent status." },
  { value: "scheduleSummary", label: "Schedule Summary", description: "Dosing patterns and upcoming dates by item." },
  { value: "scheduleByDate", label: "Schedule By Date", description: "Chronological injection schedule in the selected range." },
  { value: "history", label: "Injection History", description: "Completed, skipped, missed, and manual logs." },
  { value: "halfLifeInputs", label: "Half-Life Inputs", description: "Loaded items, blend components, half-lives, and dose events." },
  { value: "halfLifeSummary", label: "Half-Life Curves", description: "Individual half-life totals and individual curve graph." },
];

const historyLogStatuses: LogStatus[] = ["taken", "manual", "skipped", "missed"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeSearchName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const catalogBySearchName = new Map<string, (typeof PEPTIDE_CATALOG)[number]>();
for (const peptide of PEPTIDE_CATALOG) {
  [peptide.name, peptide.originalProduct, ...peptide.alternateNames].forEach((name) => {
    if (name) catalogBySearchName.set(normalizeSearchName(name), peptide);
  });
}

function getUserId(value?: { vaultUserId?: string }) {
  return value?.vaultUserId || DEFAULT_VAULT_USER_ID;
}

function makeUserNameMap(users: VaultUser[]) {
  const map = new Map<string, string>();
  users.forEach((user) => map.set(user.id, user.displayName));
  if (!map.has(DEFAULT_VAULT_USER_ID)) map.set(DEFAULT_VAULT_USER_ID, "User 1");
  return map;
}

function scheduleLabel(schedule: PeptideSchedule) {
  if (hasDoseSchedule(schedule)) {
    return `${schedule.doseSchedule?.filter((phase) => phase.doseValue > 0).length || 0} dose phase(s)`;
  }
  if (schedule.scheduleType === "daysOfWeek") {
    const days = (schedule.daysOfWeek || []).map((day) => dayNames[day]).join(", ");
    return days || "Days of week";
  }
  return `Every ${schedule.intervalDays || 1} day(s)`;
}

function getHalfLife(peptide: Peptide) {
  if (peptide.halfLifeHours && peptide.halfLifeHours > 0) {
    return {
      hours: peptide.halfLifeUnit === "days" ? peptide.halfLifeHours * 24 : peptide.halfLifeHours,
      source: "Saved vial",
    };
  }

  const match = catalogBySearchName.get(normalizeSearchName(peptide.name));

  if (match?.normalizedHalfLifeHours) {
    return {
      hours: match.normalizedHalfLifeHours,
      source: match.estimatedHalfLife ? "Catalog estimate" : "Catalog",
    };
  }

  return null;
}

function getBlendDefinitionForPeptide(peptide: Peptide) {
  const catalogMatch = catalogBySearchName.get(normalizeSearchName(peptide.name));
  return (catalogMatch ? getBlendDefinitionForCatalogId(catalogMatch.id) : undefined) || getBlendDefinitionForName(peptide.name);
}

function getDoseEventsForRange(
  peptide: Peptide,
  schedule: PeptideSchedule,
  logs: InjectionLog[],
  startDate: string,
  endDate: string,
  today: string
) {
  const eventsByKey = new Map<string, { date: string; doseMg: number }>();
  const futureStartDate = startDate < today ? today : startDate;

  getUpcomingInjectionDates(schedule, futureStartDate, endDate).forEach((date) => {
    const dose = getScheduledDoseForDate(peptide, schedule, date);
    eventsByKey.set(`scheduled-${date}`, {
      date,
      doseMg: doseToMg(dose.doseValue, dose.doseUnit),
    });
  });

  logs
    .filter(
      (log) =>
        log.peptideId === peptide.id &&
        log.scheduledDate >= startDate &&
        log.scheduledDate <= endDate
    )
    .forEach((log) => {
      if (log.status === "skipped" || log.status === "missed") {
        eventsByKey.delete(`scheduled-${log.scheduledDate}`);
        return;
      }
      if (log.status === "taken" || log.status === "manual") {
        eventsByKey.delete(`scheduled-${log.scheduledDate}`);
        eventsByKey.set(`log-${log.scheduledDate}-${log.id}`, {
          date: log.scheduledDate,
          doseMg: doseToMg(log.doseValue, log.doseUnit),
        });
      }
    });

  return Array.from(eventsByKey.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function makeFileName(label: string, extension = "pdf") {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${getLocalDateString()}.${extension}`;
}

const csvEscape = (value: unknown) => {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const toCsv = (headers: string[], rows: unknown[][]) => {
  return [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
};

function daysBetween(startDateStr: string, endDateStr: string) {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getDateRange(startDateStr: string, endDateStr: string) {
  const dates: string[] = [];
  let cursor = startDateStr;
  while (cursor <= endDateStr && dates.length < 370) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function doseToMg(value: number, unit: Peptide["desiredDoseUnit"]) {
  return unit === "mcg" ? value / 1000 : value;
}

function getDrawForDose(peptide: Peptide, doseValue: number, doseUnit: Peptide["desiredDoseUnit"]) {
  const doseMcg = doseToMg(doseValue, doseUnit) * 1000;
  const drawMl = peptide.concentrationMcgPerMl > 0 ? doseMcg / peptide.concentrationMcgPerMl : 0;
  return {
    drawMl,
    drawUnits: drawMl * peptide.unitsPerMl,
  };
}

function formatMgAmount(value: number) {
  if (value > 0 && value < 1) return `${Number((value * 1000).toFixed(2))} mcg`;
  return `${Number(value.toFixed(2))} mg`;
}

function drawPdfTable(doc: jsPDF, section: PdfTableSection, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const tableWidth = pageWidth - margin * 2;
  const weights =
    section.columnWeights && section.columnWeights.length === section.headers.length
      ? section.columnWeights
      : section.headers.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(weight, 0.1), 0);
  const colWidths = weights.map((weight) => (tableWidth * Math.max(weight, 0.1)) / totalWeight);
  const colXs = colWidths.reduce<number[]>((xs, _width, index) => {
    xs.push(index === 0 ? margin : xs[index - 1] + colWidths[index - 1]);
    return xs;
  }, []);
  let y = startY;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  if (section.title) {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.title, margin, y);
    y += 7;
  }

  const drawHeader = () => {
    const headerCells = section.headers.map((header, index) => doc.splitTextToSize(header, colWidths[index] - 4));
    const headerHeight = Math.max(9, Math.max(...headerCells.map((cell) => cell.length), 1) * 4 + 5);
    ensureSpace(headerHeight + 3);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, tableWidth, headerHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    headerCells.forEach((header, index) => {
      doc.text(header, colXs[index] + 2, y);
    });
    y += headerHeight - 1;
  };

  drawHeader();

  if (section.rows.length === 0) {
    ensureSpace(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("No records match the current report filters.", margin, y);
    return y + 12;
  }

  section.rows.forEach((row) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const cells = row.map((cell, index) => doc.splitTextToSize(cell || "--", colWidths[index] - 4));
    const maxLines = Math.max(...cells.map((cell) => cell.length), 1);
    const rowHeight = Math.max(9, maxLines * 4 + 5);
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y - 3, margin + tableWidth, y - 3);
    cells.forEach((cell, index) => {
      doc.text(cell, colXs[index] + 2, y);
    });
    y += rowHeight;
  });

  return y + 5;
}

function drawHalfLifeCurve(doc: jsPDF, inputs: HalfLifeCurveInput[], startDate: string, endDate: string, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const chartWidth = pageWidth - margin * 2;
  const chartHeight = 52;
  let y = startY;

  if (inputs.length === 0) return y;
  if (y + chartHeight + 34 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  const dates = getDateRange(startDate, endDate);
  if (dates.length === 0) return y;

  const inputValues = inputs.map((input) => ({
    input,
    values: dates.map((date) => {
      const halfLifeDays = input.halfLifeHours / 24;
      if (halfLifeDays <= 0) return 0;
      return input.events.reduce((sum, event) => {
        if (event.date > date) return sum;
        const elapsedDays = daysBetween(event.date, date);
        return sum + event.doseMg * Math.pow(0.5, elapsedDays / halfLifeDays);
      }, 0);
    }),
  }));

  const maxValue = Math.max(...inputValues.flatMap((item) => item.values), 0.001);
  const chartX = margin;
  const chartY = y + 16;
  const pointX = (index: number) => chartX + (dates.length === 1 ? 0 : (index / (dates.length - 1)) * chartWidth);
  const pointY = (value: number) => chartY + chartHeight - (value / maxValue) * chartHeight;
  const curveColors: Array<[number, number, number]> = [
    [37, 99, 235],
    [16, 185, 129],
    [245, 158, 11],
    [168, 85, 247],
    [239, 68, 68],
    [20, 184, 166],
    [217, 70, 239],
    [100, 116, 139],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Estimated Individual Half-Life Curves", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Individual active amount estimates, ${formatDate(startDate)} - ${formatDate(endDate)}`, margin, y + 6);

  doc.setDrawColor(148, 163, 184);
  doc.rect(chartX, chartY, chartWidth, chartHeight);
  doc.setDrawColor(226, 232, 240);
  for (let i = 1; i < 4; i += 1) {
    const gridY = chartY + (chartHeight / 4) * i;
    doc.line(chartX, gridY, chartX + chartWidth, gridY);
  }

  doc.setLineWidth(0.8);
  inputValues.forEach(({ values }, inputIndex) => {
    const [red, green, blue] = curveColors[inputIndex % curveColors.length];
    doc.setDrawColor(red, green, blue);
    values.forEach((value, index) => {
      if (index === 0) return;
      doc.line(pointX(index - 1), pointY(values[index - 1]), pointX(index), pointY(value));
    });
  });
  doc.setLineWidth(0.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(formatMgAmount(maxValue), chartX, chartY - 2);
  doc.text("0", chartX, chartY + chartHeight + 4);
  doc.text(formatDate(startDate), chartX, chartY + chartHeight + 9);
  doc.text(formatDate(endDate), chartX + chartWidth, chartY + chartHeight + 9, { align: "right" });

  const totalEvents = inputs.reduce((sum, input) => sum + input.events.length, 0);
  doc.text(`${inputs.length} item(s), ${totalEvents} dose event(s)`, margin, chartY + chartHeight + 17);

  let legendY = chartY + chartHeight + 22;
  inputs.slice(0, 8).forEach((input, index) => {
    const [red, green, blue] = curveColors[index % curveColors.length];
    if (legendY + 4 > pageHeight - margin) return;
    doc.setFillColor(red, green, blue);
    doc.rect(margin + (index % 4) * 64, legendY - 3, 3, 3, "F");
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(input.label, 54)[0] || input.label, margin + 5 + (index % 4) * 64, legendY);
    if (index % 4 === 3) legendY += 5;
  });
  doc.setTextColor(15, 23, 42);

  return Math.max(chartY + chartHeight + 28, legendY + 6);
}

const tableStyle: React.CSSProperties = {
  width: "max-content",
  minWidth: "100%",
  borderCollapse: "collapse",
  fontSize: "0.82rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid var(--border-color)",
  padding: "8px",
  color: "var(--text-secondary)",
  fontWeight: 800,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-color)",
  padding: "8px",
  verticalAlign: "top",
};

function ReportTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.5 }}>
        No records match the current report filters.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={thStyle}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={tdStyle}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "22px" }}>
      <h3 style={{ fontSize: "1.05rem", margin: "0 0 10px" }}>{title}</h3>
      {children}
    </section>
  );
}

export const ExportCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const today = getLocalDateString();
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [startDate, setStartDate] = useState(addDays(today, -30));
  const [endDate, setEndDate] = useState(addDays(today, 30));
  const [selectedPeptideIds, setSelectedPeptideIds] = useState<string[]>([]);
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<LogStatus[]>(["taken", "manual", "skipped", "missed"]);
  const [selectedReportSections, setSelectedReportSections] = useState<ReportSectionKey[]>([
    "stockItems",
    "openVials",
    "stackSummary",
    "scheduleSummary",
    "scheduleByDate",
    "history",
    "halfLifeInputs",
    "halfLifeSummary",
  ]);
  const [includeInactiveSchedules, setIncludeInactiveSchedules] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  const peptides = useLiveQuery(async () => activeRecords(await db.peptides.toArray()), []);
  const schedules = useLiveQuery(async () => activeRecords(await db.schedules.toArray()), []);
  const logs = useLiveQuery(async () => activeRecords(await db.injectionLogs.toArray()), []);
  const stockItems = useLiveQuery(async () => activeRecords(await db.stockItems.toArray()), []);
  const weightLogs = useLiveQuery(async () => activeRecords(await db.weightLogs.toArray()), []);
  const vaultUsers = useLiveQuery(async () => activeRecords(await db.vaultUsers.orderBy("sortOrder").toArray()), []);

  const isLoaded = peptides && schedules && logs && stockItems && weightLogs && vaultUsers;
  const userNameById = useMemo(() => makeUserNameMap(vaultUsers || []), [vaultUsers]);
  const peptideById = useMemo(() => new Map((peptides || []).map((peptide) => [peptide.id, peptide])), [peptides]);
  const stockById = useMemo(() => new Map((stockItems || []).map((stock) => [stock.id, stock])), [stockItems]);

  const isDateRangeValid = Boolean(startDate && endDate && startDate <= endDate);
  const dateRangeError = isDateRangeValid ? "" : "End date must be on or after start date.";
  const visiblePeptides = (peptides || []).filter((peptide) => selectedUserId === "all" || getUserId(peptide) === selectedUserId);
  const filteredPeptides = visiblePeptides.filter((peptide) => selectedPeptideIds.length === 0 || selectedPeptideIds.includes(peptide.id));
  const filteredPeptideIds = new Set(filteredPeptides.map((peptide) => peptide.id));
  const filteredStockItems = (stockItems || []).filter((stock) => selectedStockIds.length === 0 || selectedStockIds.includes(stock.id));
  const scheduleByPeptideId = useMemo(() => {
    return makePreferredScheduleMap(schedules || []);
  }, [schedules]);
  const sourceStockIdByOpenVialId = useMemo(() => {
    const map = new Map<string, string>();
    (peptides || []).forEach((peptide) => {
      if (!peptide.sourceStockItemId) return;
      map.set(peptide.openVialId || peptide.id, peptide.sourceStockItemId);
    });
    return map;
  }, [peptides]);

  const selectOptions = [
    { value: "all", label: "All users" },
    ...(vaultUsers || []).map((user) => ({ value: user.id, label: user.displayName })),
  ];

  const togglePeptide = (id: string) => {
    setSelectedPeptideIds((current) => {
      if (current.length === 0) return visiblePeptides.map((peptide) => peptide.id).filter((item) => item !== id);
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const toggleStock = (id: string) => {
    setSelectedStockIds((current) => {
      if (current.length === 0) return (stockItems || []).map((stock) => stock.id).filter((item) => item !== id);
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const toggleStatus = (status: LogStatus) => {
    setSelectedStatuses((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status]
    );
  };

  const toggleReportSection = (value: ReportSectionKey) => {
    setSelectedReportSections((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  const getStockSourceLabel = (peptide: Peptide) => {
    const sourceStockId = peptide.sourceStockItemId || sourceStockIdByOpenVialId.get(peptide.openVialId || peptide.id);
    if (!sourceStockId) return "Not linked";
    return stockById.get(sourceStockId)?.name || "Stock item";
  };

  const getNextScheduledDoseInfo = (peptide: Peptide) => {
    const schedule = scheduleByPeptideId.get(peptide.id);
    if (!schedule || !schedule.isActive) return null;
    const nextDate = getUpcomingInjectionDates(schedule, today, addDays(today, 370))[0];
    if (!nextDate) return null;
    const dose = getScheduledDoseForDate(peptide, schedule, nextDate);
    const draw = getDrawForDose(peptide, dose.doseValue, dose.doseUnit);
    return {
      nextDate,
      dose,
      draw,
    };
  };

  const historyRows = !isDateRangeValid ? [] : (logs || [])
    .filter((log) => {
      const peptide = peptideById.get(log.peptideId);
      const userId = log.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID;
      return (
        (selectedUserId === "all" || userId === selectedUserId) &&
        (selectedPeptideIds.length === 0 || selectedPeptideIds.includes(log.peptideId)) &&
        log.scheduledDate >= startDate &&
        log.scheduledDate <= endDate &&
        log.status !== "scheduled" &&
        selectedStatuses.includes(log.status)
      );
    })
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || (b.actualDateTime || "").localeCompare(a.actualDateTime || ""));

  const bodyProgressRows: WeightLog[] = !isDateRangeValid ? [] : (weightLogs || [])
    .filter((log) => log.date >= startDate && log.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));

  const scheduleRows = (schedules || [])
    .filter((schedule) => {
      const peptide = peptideById.get(schedule.peptideId);
      const userId = schedule.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID;
      return (
        (includeInactiveSchedules || schedule.isActive) &&
        (selectedUserId === "all" || userId === selectedUserId) &&
        (selectedPeptideIds.length === 0 || selectedPeptideIds.includes(schedule.peptideId))
      );
    })
    .sort((a, b) => {
      const peptideA = peptideById.get(a.peptideId)?.name || "";
      const peptideB = peptideById.get(b.peptideId)?.name || "";
      return peptideA.localeCompare(peptideB);
    });

  const scheduleDateRows = !isDateRangeValid ? [] : scheduleRows
    .flatMap((schedule) => {
      const peptide = peptideById.get(schedule.peptideId);
      if (!peptide || !schedule.isActive) return [];
      return getUpcomingInjectionDates(schedule, startDate, endDate).map((date) => {
        const dose = getScheduledDoseForDate(peptide, schedule, date);
        return {
          date,
          user: userNameById.get(schedule.vaultUserId || peptide.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
          peptide: peptide.name,
          dose: formatDose(dose.doseValue, dose.doseUnit),
          pattern: scheduleLabel(schedule),
        };
      });
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.user.localeCompare(b.user) || a.peptide.localeCompare(b.peptide));

  const recentStackLogs = historyRows.filter((log) => filteredPeptideIds.has(log.peptideId)).slice(0, 12);

  const halfLifeRows: HalfLifeReportRow[] = !isDateRangeValid ? [] : scheduleRows
    .filter((schedule) => schedule.isActive)
    .flatMap((schedule) => {
      const peptide = peptideById.get(schedule.peptideId);
      if (!peptide) return [];
      const halfLife = getHalfLife(peptide);
      const dates = getUpcomingInjectionDates(schedule, startDate, endDate).slice(0, 8);

      const blendDefinition = getBlendDefinitionForPeptide(peptide);

      if (blendDefinition) {
        const totalParts = blendDefinition.components.reduce((sum, component) => sum + component.parts, 0);
        return blendDefinition.components
          .map((component) => {
            const componentCatalog = PEPTIDE_CATALOG.find((item) => item.id === component.peptideCatalogId);
            if (!componentCatalog?.normalizedHalfLifeHours || totalParts <= 0) return null;
            return {
              peptide,
              schedule,
              label: `${blendDefinition.displayName} - ${componentCatalog.name}`,
              halfLife: {
                hours: componentCatalog.normalizedHalfLifeHours,
                source: componentCatalog.estimatedHalfLife ? "Catalog estimate" : "Catalog",
              },
              dates,
              doseMultiplier: component.parts / totalParts,
            };
          })
          .filter((row): row is HalfLifeReportRow => Boolean(row));
      }

      if (!halfLife) return [];
      return [{ peptide, schedule, label: peptide.name, halfLife, dates, doseMultiplier: 1 }];
    });

  const halfLifeCurveInputs: HalfLifeCurveInput[] = halfLifeRows.map(({ peptide, schedule, label, halfLife, doseMultiplier }) => {
    const baseEvents = getDoseEventsForRange(peptide, schedule, logs || [], startDate, endDate, today);

    return {
      label,
      halfLifeHours: halfLife.hours,
      events: baseEvents.map((event) => ({ ...event, doseMg: event.doseMg * doseMultiplier })),
    };
  });

  const halfLifeExcludedRows = scheduleRows
    .filter((schedule) => schedule.isActive)
    .flatMap((schedule) => {
      const peptide = peptideById.get(schedule.peptideId);
      if (!peptide) return [];
      const blendDefinition = getBlendDefinitionForPeptide(peptide);
      const user = userNameById.get(schedule.vaultUserId || peptide.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1";

      if (blendDefinition) {
        const totalParts = blendDefinition.components.reduce((sum, component) => sum + component.parts, 0);
        if (totalParts <= 0) {
          return {
            user,
            peptide: blendDefinition.displayName,
            reason: "Blend component ratios are not usable",
          };
        }

        return blendDefinition.components.flatMap((component) => {
          const componentCatalog = PEPTIDE_CATALOG.find((item) => item.id === component.peptideCatalogId);
          if (componentCatalog?.normalizedHalfLifeHours) return [];
          return {
            user,
            peptide: `${blendDefinition.displayName} - ${componentCatalog?.name || component.peptideCatalogId}`,
            reason: "Blend component has no catalog half-life available",
          };
        });
      }

      if (getHalfLife(peptide)) return [];
      return {
        user,
        peptide: peptide.name,
        reason: "No saved or catalog half-life available",
      };
    });

  const selectedSectionLabels = selectedReportSections
    .map((section) => reportSectionOptions.find((option) => option.value === section)?.label)
    .filter((label): label is string => Boolean(label));
  const canExportReport = isLoaded && isDateRangeValid && selectedReportSections.length > 0;

  const renderHistoryReport = () => (
    <ReportTable
      headers={["User", "Date", "Peptide", "Dose", "Draw", "Status", "Site", "Notes"]}
      rows={historyRows.map((log) => {
        const peptide = peptideById.get(log.peptideId);
        const userId = log.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID;
        return [
          userNameById.get(userId) || "User 1",
          <>
            <strong>{formatDate(log.scheduledDate)}</strong>
            <div style={{ color: "var(--text-secondary)" }}>{formatDateTime(log.actualDateTime)}</div>
          </>,
          log.peptideNameSnapshot || peptide?.name || "--",
          formatDose(log.doseValue, log.doseUnit),
          `${formatMl(log.drawMl)} / ${formatUnits(log.drawUnits)}`,
          log.status,
          log.injectionSiteLabel || "--",
          log.notes || "--",
        ];
      })}
    />
  );

  const renderStackReport = () => (
    <>
      <ReportTable
        headers={["User", "Peptide", "Current Vial", "Schedule", "Stock Source", "Recent Status"]}
        rows={filteredPeptides.map((peptide) => {
          const schedule = scheduleRows.find((item) => item.peptideId === peptide.id);
          const recentLog = historyRows.find((log) => log.peptideId === peptide.id);
          return [
            userNameById.get(getUserId(peptide)) || "User 1",
            peptide.name,
            `${peptide.vialMg} mg / ${peptide.bacWaterMl} mL`,
            schedule ? `${schedule.isActive ? "Active" : "Inactive"} - ${scheduleLabel(schedule)}` : "--",
            getStockSourceLabel(peptide),
            recentLog ? `${recentLog.status} on ${formatDate(recentLog.scheduledDate)}` : "--",
          ];
        })}
      />
      <h3 style={{ marginTop: "20px", fontSize: "1rem" }}>Recent Injection History</h3>
      <ReportTable
        headers={["Date", "Peptide", "Dose", "Status", "Site"]}
        rows={recentStackLogs.map((log) => [
          formatDate(log.scheduledDate),
          log.peptideNameSnapshot,
          formatDose(log.doseValue, log.doseUnit),
          log.status,
          log.injectionSiteLabel || "--",
        ])}
      />
    </>
  );

  const getPdfSections = (sectionKey: ReportSectionKey): PdfTableSection[] => {
    if (sectionKey === "stockItems") {
      return [
        {
          title: "Vault Stock Items",
          headers: ["Item", "Amount", "Supplier", "Ordered", "Received", "Manufacturer", "COA", "Storage / Notes"],
          columnWeights: [1.6, 1, 1, 0.9, 0.9, 0.9, 0.7, 2],
          rows: filteredStockItems.map((stock) => [
            `${stock.name}\nBatch ${stock.batchNumber || "--"}`,
            `${stock.numberOfVials || "--"} vial(s), ${stock.mgPerVial || "--"} mg/vial`,
            stock.supplier || "--",
            formatDate(stock.orderedDate),
            stock.receivedDate ? formatDate(stock.receivedDate) : "Not received",
            formatDate(stock.manufacturerDate),
            stock.coaFileName ? "Attached" : "--",
            [stock.storedLocation || "--", stock.notes || ""].filter(Boolean).join("\n"),
          ]),
        },
      ];
    }

    if (sectionKey === "openVials") {
      return [
        {
          title: "Open Vials",
          headers: ["User", "Peptide", "Vial", "Scheduled Dose", "Draw", "Next Dose", "Vial Opened", "Source"],
          columnWeights: [0.9, 1.4, 1, 1, 1, 0.9, 0.9, 1.4],
          rows: filteredPeptides.map((peptide) => {
            const nextDose = getNextScheduledDoseInfo(peptide);
            return [
              userNameById.get(getUserId(peptide)) || "User 1",
              peptide.name,
              `${peptide.vialMg} mg / ${peptide.bacWaterMl} mL`,
              nextDose ? formatDose(nextDose.dose.doseValue, nextDose.dose.doseUnit) : "No active schedule",
              nextDose ? `${formatMl(nextDose.draw.drawMl)} / ${formatUnits(nextDose.draw.drawUnits)}` : "--",
              nextDose ? formatDate(nextDose.nextDate) : "--",
              peptide.currentVialStartedAt ? formatDate(peptide.currentVialStartedAt.slice(0, 10)) : "Not recorded",
              getStockSourceLabel(peptide),
            ];
          }),
        },
      ];
    }

    if (sectionKey === "history") {
      return [
        {
          title: "Injection History",
          headers: ["User", "Date", "Peptide", "Dose", "Draw", "Status", "Site", "Notes"],
          columnWeights: [0.9, 1.1, 1.4, 0.8, 0.9, 0.7, 1.1, 2.1],
          rows: historyRows.map((log) => {
            const peptide = peptideById.get(log.peptideId);
            const userId = log.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID;
            return [
              userNameById.get(userId) || "User 1",
              `${formatDate(log.scheduledDate)}\n${formatDateTime(log.actualDateTime)}`,
              log.peptideNameSnapshot || peptide?.name || "--",
              formatDose(log.doseValue, log.doseUnit),
              `${formatMl(log.drawMl)} / ${formatUnits(log.drawUnits)}`,
              log.status,
              log.injectionSiteLabel || "--",
              log.notes || "--",
            ];
          }),
        },
      ];
    }

    if (sectionKey === "scheduleSummary") {
      return [
        {
          title: "Schedule Summary",
          headers: ["User", "Peptide", "Status", "Pattern", "Next Dates", "Dose"],
          columnWeights: [0.9, 1.4, 0.7, 1.2, 2.3, 0.9],
          rows: scheduleRows.map((schedule) => {
            const peptide = peptideById.get(schedule.peptideId);
            const dates = schedule.isActive ? getUpcomingInjectionDates(schedule, startDate, endDate).slice(0, 8) : [];
            const firstDoseDate = dates[0] || startDate;
            const dose = peptide ? getScheduledDoseForDate(peptide, schedule, firstDoseDate) : null;
            return [
              userNameById.get(schedule.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
              peptide?.name || "--",
              schedule.isActive ? "Active" : "Inactive",
              scheduleLabel(schedule),
              dates.length ? dates.map(formatDate).join(", ") : "--",
              dose ? formatDose(dose.doseValue, dose.doseUnit) : "--",
            ];
          }),
        },
      ];
    }

    if (sectionKey === "scheduleByDate") {
      return [
        {
          title: "Schedule By Date",
          headers: ["Date", "User", "Peptide", "Dose", "Pattern"],
          columnWeights: [0.9, 0.9, 1.5, 0.9, 1.8],
          rows: scheduleDateRows.map((row) => [
            formatDate(row.date),
            row.user,
            row.peptide,
            row.dose,
            row.pattern,
          ]),
        },
      ];
    }

    if (sectionKey === "stackSummary") {
      return [
        {
          title: "Selected Stack Items",
          headers: ["User", "Peptide", "Current Vial", "Schedule", "Stock Source", "Recent Status"],
          columnWeights: [0.9, 1.5, 1, 1.8, 1.4, 1.1],
          rows: filteredPeptides.map((peptide) => {
            const schedule = scheduleRows.find((item) => item.peptideId === peptide.id);
            const recentLog = historyRows.find((log) => log.peptideId === peptide.id);
            return [
              userNameById.get(getUserId(peptide)) || "User 1",
              peptide.name,
              `${peptide.vialMg} mg / ${peptide.bacWaterMl} mL`,
              schedule ? `${schedule.isActive ? "Active" : "Inactive"} - ${scheduleLabel(schedule)}` : "--",
              getStockSourceLabel(peptide),
              recentLog ? `${recentLog.status} on ${formatDate(recentLog.scheduledDate)}` : "--",
            ];
          }),
        },
        {
          title: "Recent Injection History",
          headers: ["Date", "Peptide", "Dose", "Status", "Site"],
          columnWeights: [0.9, 1.8, 0.9, 0.8, 1.5],
          rows: recentStackLogs.map((log) => [
            formatDate(log.scheduledDate),
            log.peptideNameSnapshot,
            formatDose(log.doseValue, log.doseUnit),
            log.status,
            log.injectionSiteLabel || "--",
          ]),
        },
      ];
    }

    if (sectionKey === "halfLifeInputs") {
      return [
        {
          title: "Half-Life Stack Inputs",
          headers: ["User", "Peptide", "Half-Life", "Schedule", "Dose Events In Range"],
          columnWeights: [0.9, 1.7, 1.4, 1.1, 2.4],
          rows: halfLifeRows.map(({ peptide, schedule, label, halfLife, dates }) => [
            userNameById.get(schedule.vaultUserId || peptide.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
            label,
            `${(halfLife.hours / 24).toFixed(2)} days (${Math.round(halfLife.hours)} hours) - ${halfLife.source}`,
            scheduleLabel(schedule),
            dates.length ? dates.map(formatDate).join(", ") : "--",
          ]),
        },
      ];
    }

    if (sectionKey === "halfLifeSummary") {
      return [
        {
          title: "Half-Life Curve Summary",
          headers: ["Item", "Half-Life", "Dose Events", "Total Scheduled"],
          columnWeights: [2, 1, 0.9, 1.1],
          rows: halfLifeCurveInputs.map((input) => [
            input.label,
            `${(input.halfLifeHours / 24).toFixed(2)} days`,
            `${input.events.length}`,
            formatMgAmount(input.events.reduce((sum, event) => sum + event.doseMg, 0)),
          ]),
        },
      ];
    }

    return [];
  };

  const addPdfPageNumbers = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const pageCount = doc.getNumberOfPages();
    const contentPageCount = Math.max(0, pageCount - 1);
    for (let page = 2; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${page - 1} of ${contentPageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  };

  const drawCoverPage = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const generatedAt = new Date().toLocaleString();
    const userScope = selectedUserId === "all" ? "All users" : userNameById.get(selectedUserId) || "Selected user";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Compiled Export Report", margin, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated ${generatedAt}`, margin, 29);
    doc.text(userScope, pageWidth - margin, 20, { align: "right" });
    doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth - margin, 29, { align: "right" });

    drawPdfTable(
      doc,
      {
        title: "Report Summary",
        headers: ["Scope", "Value"],
        columnWeights: [1, 3],
        rows: [
          ["User Scope", userScope],
          ["Date Range", `${formatDate(startDate)} - ${formatDate(endDate)}`],
          ["Included Sections", selectedSectionLabels.join(", ") || "--"],
          ["Peptide Items", `${filteredPeptides.length}`],
          ["Stock Items", `${filteredStockItems.length}`],
          ["History Logs", `${historyRows.length}`],
          ["Schedule Dates", `${scheduleDateRows.length}`],
        ],
      },
      44
    );
  };

  const drawReportSectionIntoPdf = (doc: jsPDF, sectionKey: ReportSectionKey, startOnNewPage: boolean) => {
    if (startOnNewPage) doc.addPage();
    let y = 18;
    getPdfSections(sectionKey).forEach((section) => {
      y = drawPdfTable(doc, section, y);
    });
    if (sectionKey === "halfLifeSummary") {
      y = drawHalfLifeCurve(doc, halfLifeCurveInputs, startDate, endDate, y);
    }
  };

  const handleDownloadPdf = async () => {
    if (!canExportReport) return;
    setExportMessage("");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    drawCoverPage(doc);
    selectedReportSections.forEach((sectionKey) => {
      drawReportSectionIntoPdf(doc, sectionKey, true);
    });
    if (
      selectedReportSections.some((section) => section === "halfLifeInputs" || section === "halfLifeSummary") &&
      halfLifeExcludedRows.length > 0
    ) {
      doc.addPage();
      drawPdfTable(
        doc,
        {
          title: "Half-Life Items Not Included",
          headers: ["User", "Peptide", "Reason"],
          columnWeights: [0.9, 1.6, 2.5],
          rows: halfLifeExcludedRows.map((row) => [row.user, row.peptide, row.reason]),
        },
        18
      );
    }
    addPdfPageNumbers(doc);
    const filename = makeFileName("Compiled Report");
    try {
      const message = await exportFile(filename, doc.output("blob"));
      setExportMessage(`${filename}: ${message}`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Unable to export this PDF.");
    }
  };

  const handleDownloadCsv = (
    label: string,
    headers: string[],
    rows: unknown[][]
  ) => {
    if (!isLoaded || !isDateRangeValid) return;
    const filename = makeFileName(label, "csv");
    setExportMessage("");
    exportFile(filename, textToBlob(toCsv(headers, rows), "text/csv;charset=utf-8"))
      .then((message) => setExportMessage(`${filename}: ${message}`))
      .catch((error) => {
        setExportMessage(error instanceof Error ? error.message : "Unable to export this CSV.");
      });
  };

  const handleDownloadInjectionHistoryCsv = () => {
    handleDownloadCsv(
      "Injection History",
      ["User", "Scheduled Date", "Actual Date Time", "Peptide", "Dose", "Dose Unit", "Draw mL", "Draw Units", "Status", "Injection Site", "Notes"],
      historyRows.map((log) => {
        const peptide = peptideById.get(log.peptideId);
        const userId = log.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID;
        return [
          userNameById.get(userId) || "User 1",
          log.scheduledDate,
          log.actualDateTime || "",
          log.peptideNameSnapshot || peptide?.name || "",
          log.doseValue,
          log.doseUnit,
          log.drawMl,
          log.drawUnits,
          log.status,
          log.injectionSiteLabel || "",
          log.notes || "",
        ];
      })
    );
  };

  const handleDownloadBodyProgressCsv = () => {
    handleDownloadCsv(
      "Body Progress",
      ["Date", "Time", "Weight", "Body Fat", "Waist", "Chest", "Neck", "Arm", "Thigh", "Custom", "Notes"],
      bodyProgressRows.map((log) => [
        log.date,
        log.time,
        log.weight,
        log.bodyFat || "",
        log.waist || "",
        log.chest || "",
        log.neck || "",
        log.arm || "",
        log.thigh || "",
        log.customMeasurements ? JSON.stringify(log.customMeasurements) : "",
        log.notes || "",
      ])
    );
  };

  const handleDownloadVaultStockCsv = () => {
    handleDownloadCsv(
      "Vault Stock",
      ["Item", "Batch", "Vials", "Mg Per Vial", "Supplier", "Ordered", "Received", "Manufacturer", "Stored", "COA", "Notes"],
      filteredStockItems.map((stock) => [
        stock.name,
        stock.batchNumber || "",
        stock.numberOfVials || "",
        stock.mgPerVial || "",
        stock.supplier || "",
        stock.orderedDate || "",
        stock.receivedDate || "",
        stock.manufacturerDate || "",
        stock.storedLocation || "",
        stock.coaFileName || "",
        stock.notes || "",
      ])
    );
  };

  const handleDownloadOpenVialsCsv = () => {
    handleDownloadCsv(
      "Open Vials",
      ["User", "Peptide", "Vial Mg", "BAC Water mL", "Scheduled Dose", "Dose Unit", "Draw mL", "Draw Units", "Next Dose", "Vial Opened", "Source"],
      filteredPeptides.map((peptide) => {
        const nextDose = getNextScheduledDoseInfo(peptide);
        return [
          userNameById.get(getUserId(peptide)) || "User 1",
          peptide.name,
          peptide.vialMg,
          peptide.bacWaterMl,
          nextDose?.dose.doseValue ?? "",
          nextDose?.dose.doseUnit ?? "",
          nextDose?.draw.drawMl ?? "",
          nextDose?.draw.drawUnits ?? "",
          nextDose?.nextDate ?? "",
          peptide.currentVialStartedAt ? peptide.currentVialStartedAt.slice(0, 10) : "",
          getStockSourceLabel(peptide),
        ];
      })
    );
  };

  const handleDownloadInjectionScheduleCsv = () => {
    handleDownloadCsv(
      "Injection Schedule",
      ["Date", "User", "Peptide", "Dose", "Pattern"],
      scheduleDateRows.map((row) => [row.date, row.user, row.peptide, row.dose, row.pattern])
    );
  };

  const renderExcludedHalfLifeItems = () => {
    if (!selectedReportSections.some((section) => section === "halfLifeInputs" || section === "halfLifeSummary")) return null;
    if (halfLifeExcludedRows.length === 0) return null;

    return (
      <div style={{ marginTop: "18px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>Half-Life Items Not Included</h3>
        <ReportTable
          headers={["User", "Peptide", "Reason"]}
          rows={halfLifeExcludedRows.map((row) => [row.user, row.peptide, row.reason])}
        />
      </div>
    );
  };

  const renderReportSection = (sectionKey: ReportSectionKey) => {
    if (sectionKey === "stockItems") {
      return (
        <ReportSection title="Vault Stock">
          <ReportTable
            headers={["Item", "Amount", "Supplier", "Ordered", "Received", "Manufacturer", "COA", "Storage / Notes"]}
            rows={filteredStockItems.map((stock: StockItem) => [
              <>
                <strong>{stock.name}</strong>
                <div style={{ color: "var(--text-secondary)" }}>Batch {stock.batchNumber || "--"}</div>
              </>,
              `${stock.numberOfVials || "--"} vial(s), ${stock.mgPerVial || "--"} mg/vial`,
              stock.supplier || "--",
              formatDate(stock.orderedDate),
              stock.receivedDate ? formatDate(stock.receivedDate) : "Not received",
              formatDate(stock.manufacturerDate),
              stock.coaFileName ? "Attached" : "--",
              <>
                <div>{stock.storedLocation || "--"}</div>
                {stock.notes && <div style={{ color: "var(--text-secondary)" }}>{stock.notes}</div>}
              </>,
            ])}
          />
        </ReportSection>
      );
    }
    if (sectionKey === "openVials") {
      return (
        <ReportSection title="Open Vials">
          <ReportTable
            headers={["User", "Peptide", "Vial", "Scheduled Dose", "Draw", "Next Dose", "Vial Opened", "Source"]}
            rows={filteredPeptides.map((peptide) => {
              const nextDose = getNextScheduledDoseInfo(peptide);
              return [
                userNameById.get(getUserId(peptide)) || "User 1",
                peptide.name,
                `${peptide.vialMg} mg / ${peptide.bacWaterMl} mL`,
                nextDose ? formatDose(nextDose.dose.doseValue, nextDose.dose.doseUnit) : "No active schedule",
                nextDose ? `${formatMl(nextDose.draw.drawMl)} / ${formatUnits(nextDose.draw.drawUnits)}` : "--",
                nextDose ? formatDate(nextDose.nextDate) : "--",
                peptide.currentVialStartedAt ? formatDate(peptide.currentVialStartedAt.slice(0, 10)) : "Not recorded",
                getStockSourceLabel(peptide),
              ];
            })}
          />
        </ReportSection>
      );
    }
    if (sectionKey === "stackSummary") return <ReportSection title="Stack Summary">{renderStackReport()}</ReportSection>;
    if (sectionKey === "scheduleSummary") {
      return (
        <ReportSection title="Schedule Summary">
          <ReportTable
            headers={["User", "Peptide", "Status", "Pattern", "Next Dates", "Dose"]}
            rows={scheduleRows.map((schedule) => {
              const peptide = peptideById.get(schedule.peptideId);
              const dates = schedule.isActive ? getUpcomingInjectionDates(schedule, startDate, endDate).slice(0, 8) : [];
              const firstDoseDate = dates[0] || startDate;
              const dose = peptide ? getScheduledDoseForDate(peptide, schedule, firstDoseDate) : null;
              return [
                userNameById.get(schedule.vaultUserId || peptide?.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
                peptide?.name || "--",
                schedule.isActive ? "Active" : "Inactive",
                scheduleLabel(schedule),
                dates.length ? dates.map(formatDate).join(", ") : "--",
                dose ? formatDose(dose.doseValue, dose.doseUnit) : "--",
              ];
            })}
          />
        </ReportSection>
      );
    }
    if (sectionKey === "scheduleByDate") {
      return (
        <ReportSection title="Schedule By Date">
          <ReportTable
            headers={["Date", "User", "Peptide", "Dose", "Pattern"]}
            rows={scheduleDateRows.map((row) => [formatDate(row.date), row.user, row.peptide, row.dose, row.pattern])}
          />
        </ReportSection>
      );
    }
    if (sectionKey === "history") return <ReportSection title="Injection History">{renderHistoryReport()}</ReportSection>;
    if (sectionKey === "halfLifeInputs") {
      return (
        <ReportSection title="Half-Life Inputs">
          <ReportTable
            headers={["User", "Peptide", "Half-Life", "Schedule", "Dose Events In Range"]}
            rows={halfLifeRows.map(({ peptide, schedule, label, halfLife, dates }) => [
              userNameById.get(schedule.vaultUserId || peptide.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
              label,
              `${(halfLife.hours / 24).toFixed(2)} days (${Math.round(halfLife.hours)} hours) - ${halfLife.source}`,
              scheduleLabel(schedule),
              dates.length ? dates.map(formatDate).join(", ") : "--",
            ])}
          />
        </ReportSection>
      );
    }
    return (
      <ReportSection title="Half-Life Curves">
        <ReportTable
          headers={["Item", "Half-Life", "Dose Events", "Total Scheduled"]}
          rows={halfLifeCurveInputs.map((input) => [
            input.label,
            `${(input.halfLifeHours / 24).toFixed(2)} days`,
            `${input.events.length}`,
            formatMgAmount(input.events.reduce((sum, event) => sum + event.doseMg, 0)),
          ])}
        />
      </ReportSection>
    );
  };

  const renderReport = () => {
    if (!isLoaded) {
      return <p style={{ color: "var(--text-secondary)" }}>Loading report data...</p>;
    }
    if (!isDateRangeValid) {
      return <p style={{ color: "var(--color-warning)", fontWeight: 700 }}>{dateRangeError}</p>;
    }
    if (selectedReportSections.length === 0) {
      return <p style={{ color: "var(--text-secondary)" }}>Select at least one report section.</p>;
    }
    return (
      <>
        {selectedReportSections.map((sectionKey) => (
          <React.Fragment key={sectionKey}>{renderReportSection(sectionKey)}</React.Fragment>
        ))}
        {renderExcludedHalfLifeItems()}
      </>
    );
  };

  return (
    <div className="fade-in" style={{ paddingBottom: "35px" }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", margin: 0 }}>Export Center</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", margin: "6px 0 0", lineHeight: 1.45 }}>
            Preview reports, download a PDF, or use the browser print flow.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/settings")}>
          <ArrowLeft size={16} />
          Settings
        </Button>
      </div>

      <Card className="no-print" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "14px" }}>
          <div className="form-row-grid">
            <Select label="User Scope" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} options={selectOptions} />
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.86rem", paddingTop: "24px" }}>
              <input
                type="checkbox"
                checked={includeInactiveSchedules}
                onChange={(event) => setIncludeInactiveSchedules(event.target.checked)}
              />
              Include inactive schedules
            </label>
          </div>

          <div className="form-row-grid">
            <Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              error={dateRangeError || undefined}
            />
          </div>

          <div
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px",
              background: "var(--bg-input)",
            }}
          >
            <span className="form-label">Report Sections</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px", marginTop: "10px" }}>
              {reportSectionOptions.map((option) => (
                <label key={option.value} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "var(--text-secondary)", fontSize: "0.86rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedReportSections.includes(option.value)}
                    onChange={() => toggleReportSection(option.value)}
                    style={{ marginTop: "3px" }}
                  />
                  <span>
                    <strong style={{ color: "var(--text-primary)" }}>{option.label}</strong>
                    <span style={{ display: "block", fontSize: "0.76rem", lineHeight: 1.35 }}>{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {selectedReportSections.includes("history") && (
            <div>
              <span className="form-label">History Statuses</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {historyLogStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`btn ${selectedStatuses.includes(status) ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                    onClick={() => toggleStatus(status)}
                  >
                    {selectedStatuses.includes(status) && <Check size={14} />}
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedReportSections.includes("stockItems") ? (
            <div>
              <span className="form-label">Vault Stock Items</span>
              <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                {(stockItems || []).map((stock) => (
                  <label key={stock.id} style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.86rem" }}>
                    <input type="checkbox" checked={selectedStockIds.length === 0 || selectedStockIds.includes(stock.id)} onChange={() => toggleStock(stock.id)} />
                    {stock.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {selectedReportSections.some((section) => section !== "stockItems") && (
            <div>
              <span className="form-label">Peptides / Stack Items</span>
              <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                {visiblePeptides.map((peptide) => (
                  <label key={peptide.id} style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.86rem" }}>
                    <input
                      type="checkbox"
                      checked={selectedPeptideIds.length === 0 || selectedPeptideIds.includes(peptide.id)}
                      onChange={() => togglePeptide(peptide.id)}
                    />
                    {peptide.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
            <Button variant="primary" onClick={handleDownloadPdf} disabled={!canExportReport}>
              <Download size={16} />
              Download PDF
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print / Save PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedPeptideIds([]);
                setSelectedStockIds([]);
                setSelectedStatuses(["taken", "manual", "skipped", "missed"]);
                setSelectedReportSections(reportSectionOptions.map((option) => option.value));
              }}
            >
              Clear Filters
            </Button>
          </div>
          {exportMessage && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.45 }}>
              {exportMessage}
            </p>
          )}

          <div
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px",
              background: "var(--bg-input)",
            }}
          >
            <span className="form-label">CSV Exports</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginTop: "10px" }}>
              <Button variant="secondary" onClick={handleDownloadVaultStockCsv} disabled={!canExportReport}>
                <FileDown size={16} />
                Vault Stock
              </Button>
              <Button variant="secondary" onClick={handleDownloadOpenVialsCsv} disabled={!canExportReport}>
                <FileDown size={16} />
                Open Vials
              </Button>
              <Button variant="secondary" onClick={handleDownloadInjectionHistoryCsv} disabled={!canExportReport}>
                <FileDown size={16} />
                Injection History
              </Button>
              <Button variant="secondary" onClick={handleDownloadInjectionScheduleCsv} disabled={!canExportReport}>
                <FileDown size={16} />
                Injection Schedule
              </Button>
              <Button variant="secondary" onClick={handleDownloadBodyProgressCsv} disabled={!canExportReport}>
                <FileDown size={16} />
                Body Progress
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="export-report-printable">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={20} style={{ color: "var(--color-primary)" }} />
              Compiled Report
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", margin: "6px 0 0" }}>
              Generated {new Date().toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            <div>{selectedUserId === "all" ? "All users" : userNameById.get(selectedUserId) || "Selected user"}</div>
            <div>
              {formatDate(startDate)} - {formatDate(endDate)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
            marginBottom: "16px",
            padding: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--border-radius-sm)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {[
            ["Sections", `${selectedReportSections.length}`],
            ["Peptides", `${filteredPeptides.length}`],
            ["Stock Items", `${filteredStockItems.length}`],
            ["History Logs", `${historyRows.length}`],
            ["Schedule Dates", `${scheduleDateRows.length}`],
            ["Half-Life Items", `${halfLifeRows.length}`],
            ["Body Logs", `${bodyProgressRows.length}`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontWeight: 800, marginTop: "3px" }}>{value}</div>
            </div>
          ))}
        </div>

        {renderReport()}
      </Card>
    </div>
  );
};
