import React, { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { jsPDF } from "jspdf";
import { ArrowLeft, Check, Download, FileText, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { db } from "../../db/db";
import { ensureDefaultVaultUser } from "../../db/vaultUsers";
import type { InjectionLog } from "../../types/injectionLog";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { StockItem } from "../../types/stock";
import { DEFAULT_VAULT_USER_ID, type VaultUser } from "../../types/vaultUser";
import { PEPTIDE_CATALOG } from "../../utils/peptideCatalog";
import {
  addDays,
  getLocalDateString,
  getScheduledDoseForDate,
  getUpcomingInjectionDates,
  hasDoseSchedule,
} from "../../utils/dateUtils";
import { formatDose, formatMl, formatUnits } from "../../utils/formatting";
import { makePreferredScheduleMap } from "../../utils/scheduleUtils";

type ReportType = "stock" | "history" | "schedule" | "stack" | "halfLife";
type LogStatus = InjectionLog["status"];
type PdfTableSection = {
  title?: string;
  headers: string[];
  rows: string[][];
};
type HalfLifeCurveInput = {
  label: string;
  halfLifeHours: number;
  events: Array<{ date: string; doseMg: number }>;
};

const reportOptions: Array<{ value: ReportType; label: string; description: string }> = [
  { value: "stock", label: "Vault Stock", description: "Unopened inventory and open vial status." },
  { value: "history", label: "Injection History", description: "Completed, skipped, missed, and manual logs." },
  { value: "schedule", label: "Injection Schedule", description: "Upcoming injection calendar by user and peptide." },
  { value: "stack", label: "Individual Stack", description: "Selected peptides, schedules, stock, and recent history." },
  { value: "halfLife", label: "Half-Life Loaded Stack", description: "Active scheduled items with half-life inputs and dose events." },
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

  const match = PEPTIDE_CATALOG.find((item) =>
    [item.name, item.originalProduct, ...item.alternateNames]
      .filter((name): name is string => Boolean(name))
      .some((name) => normalizeSearchName(name) === normalizeSearchName(peptide.name))
  );

  if (match?.normalizedHalfLifeHours) {
    return {
      hours: match.normalizedHalfLifeHours,
      source: match.estimatedHalfLife ? "Catalog estimate" : "Catalog",
    };
  }

  return null;
}

function makeFileName(label: string) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${getLocalDateString()}.pdf`;
}

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
  const colWidth = tableWidth / Math.max(section.headers.length, 1);
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
    ensureSpace(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, tableWidth, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    section.headers.forEach((header, index) => {
      const x = margin + index * colWidth + 2;
      doc.text(doc.splitTextToSize(header, colWidth - 4), x, y);
    });
    y += 8;
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
    const cells = row.map((cell) => doc.splitTextToSize(cell || "--", colWidth - 4));
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
      const x = margin + index * colWidth + 2;
      doc.text(cell, x, y);
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

  const combinedValues = dates.map((date) =>
    inputs.reduce((total, input) => {
      const halfLifeDays = input.halfLifeHours / 24;
      if (halfLifeDays <= 0) return total;
      const value = input.events.reduce((sum, event) => {
        if (event.date > date) return sum;
        const elapsedDays = daysBetween(event.date, date);
        return sum + event.doseMg * Math.pow(0.5, elapsedDays / halfLifeDays);
      }, 0);
      return total + value;
    }, 0)
  );

  const maxValue = Math.max(...combinedValues, 0.001);
  const chartX = margin;
  const chartY = y + 16;
  const pointX = (index: number) => chartX + (dates.length === 1 ? 0 : (index / (dates.length - 1)) * chartWidth);
  const pointY = (value: number) => chartY + chartHeight - (value / maxValue) * chartHeight;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Estimated Half-Life Curve", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Combined active amount estimate, ${formatDate(startDate)} - ${formatDate(endDate)}`, margin, y + 6);

  doc.setDrawColor(148, 163, 184);
  doc.rect(chartX, chartY, chartWidth, chartHeight);
  doc.setDrawColor(226, 232, 240);
  for (let i = 1; i < 4; i += 1) {
    const gridY = chartY + (chartHeight / 4) * i;
    doc.line(chartX, gridY, chartX + chartWidth, gridY);
  }

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  combinedValues.forEach((value, index) => {
    if (index === 0) return;
    doc.line(pointX(index - 1), pointY(combinedValues[index - 1]), pointX(index), pointY(value));
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

  return chartY + chartHeight + 24;
}

const tableStyle: React.CSSProperties = {
  width: "100%",
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
    <div style={{ overflowX: "auto" }}>
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

export const ExportCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const today = getLocalDateString();
  const [reportType, setReportType] = useState<ReportType>("stock");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [startDate, setStartDate] = useState(addDays(today, -30));
  const [endDate, setEndDate] = useState(addDays(today, 30));
  const [selectedPeptideIds, setSelectedPeptideIds] = useState<string[]>([]);
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<LogStatus[]>(["taken", "manual", "skipped", "missed"]);
  const [selectedBundleReports, setSelectedBundleReports] = useState<ReportType[]>(["stock", "history", "schedule"]);
  const [includeInactiveSchedules, setIncludeInactiveSchedules] = useState(false);

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  const peptides = useLiveQuery(() => db.peptides.toArray(), []);
  const schedules = useLiveQuery(() => db.schedules.toArray(), []);
  const logs = useLiveQuery(() => db.injectionLogs.toArray(), []);
  const stockItems = useLiveQuery(() => db.stockItems.toArray(), []);
  const vaultUsers = useLiveQuery(() => db.vaultUsers.orderBy("sortOrder").toArray(), []);

  const isLoaded = peptides && schedules && logs && stockItems && vaultUsers;
  const userNameById = useMemo(() => makeUserNameMap(vaultUsers || []), [vaultUsers]);
  const peptideById = useMemo(() => new Map((peptides || []).map((peptide) => [peptide.id, peptide])), [peptides]);
  const stockById = useMemo(() => new Map((stockItems || []).map((stock) => [stock.id, stock])), [stockItems]);

  const reportInfo = reportOptions.find((option) => option.value === reportType) || reportOptions[0];
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

  const toggleBundleReport = (value: ReportType) => {
    setSelectedBundleReports((current) =>
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

  const historyRows = (logs || [])
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

  const scheduleDateRows = scheduleRows
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

  const halfLifeRows = scheduleRows
    .filter((schedule) => schedule.isActive)
    .map((schedule) => {
      const peptide = peptideById.get(schedule.peptideId);
      if (!peptide) return null;
      const halfLife = getHalfLife(peptide);
      if (!halfLife) return null;
      const dates = getUpcomingInjectionDates(schedule, startDate, endDate).slice(0, 8);
      return { peptide, schedule, halfLife, dates };
    })
    .filter((row): row is { peptide: Peptide; schedule: PeptideSchedule; halfLife: { hours: number; source: string }; dates: string[] } =>
      Boolean(row)
    );

  const halfLifeCurveInputs: HalfLifeCurveInput[] = halfLifeRows.map(({ peptide, schedule, halfLife }) => {
    const eventsByDate = new Map<string, { date: string; doseMg: number }>();
    const futureStartDate = startDate < today ? today : startDate;

    getUpcomingInjectionDates(schedule, futureStartDate, endDate).forEach((date) => {
      const dose = getScheduledDoseForDate(peptide, schedule, date);
      eventsByDate.set(date, {
        date,
        doseMg: doseToMg(dose.doseValue, dose.doseUnit),
      });
    });

    (logs || [])
      .filter(
        (log) =>
          log.peptideId === peptide.id &&
          log.scheduledDate >= startDate &&
          log.scheduledDate <= endDate
      )
      .forEach((log) => {
        if (log.status === "skipped" || log.status === "missed") {
          eventsByDate.delete(log.scheduledDate);
          return;
        }
        if (log.status === "taken" || log.status === "manual") {
          eventsByDate.set(log.scheduledDate, {
            date: log.scheduledDate,
            doseMg: doseToMg(log.doseValue, log.doseUnit),
          });
        }
      });

    return {
      label: peptide.name,
      halfLifeHours: halfLife.hours,
      events: Array.from(eventsByDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

  const renderStockReport = () => (
    <>
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
      <h3 style={{ marginTop: "20px", fontSize: "1rem" }}>Open Vials</h3>
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
    </>
  );

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

  const renderScheduleReport = () => (
    <>
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
      <h3 style={{ marginTop: "20px", fontSize: "1rem" }}>Schedule By Date</h3>
      <ReportTable
        headers={["Date", "User", "Peptide", "Dose", "Pattern"]}
        rows={scheduleDateRows.map((row) => [
          formatDate(row.date),
          row.user,
          row.peptide,
          row.dose,
          row.pattern,
        ])}
      />
    </>
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

  const renderHalfLifeReport = () => (
    <>
      <ReportTable
        headers={["User", "Peptide", "Half-Life", "Schedule", "Dose Events In Range"]}
        rows={halfLifeRows.map(({ peptide, schedule, halfLife, dates }) => [
          userNameById.get(schedule.vaultUserId || peptide.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
          peptide.name,
          `${(halfLife.hours / 24).toFixed(2)} days (${Math.round(halfLife.hours)} hours) - ${halfLife.source}`,
          scheduleLabel(schedule),
          dates.length ? dates.map(formatDate).join(", ") : "--",
        ])}
      />
      <h3 style={{ marginTop: "20px", fontSize: "1rem" }}>Half-Life Curve Summary</h3>
      <ReportTable
        headers={["Item", "Half-Life", "Dose Events", "Total Scheduled"]}
        rows={halfLifeCurveInputs.map((input) => [
          input.label,
          `${(input.halfLifeHours / 24).toFixed(2)} days`,
          `${input.events.length}`,
          formatMgAmount(input.events.reduce((sum, event) => sum + event.doseMg, 0)),
        ])}
      />
    </>
  );

  const getPdfSections = (type: ReportType): PdfTableSection[] => {
    if (type === "stock") {
      return [
        {
          title: "Vault Stock Items",
          headers: ["Item", "Amount", "Supplier", "Ordered", "Received", "Manufacturer", "COA", "Storage / Notes"],
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
        {
          title: "Open Vials",
          headers: ["User", "Peptide", "Vial", "Scheduled Dose", "Draw", "Next Dose", "Vial Opened", "Source"],
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

    if (type === "history") {
      return [
        {
          headers: ["User", "Date", "Peptide", "Dose", "Draw", "Status", "Site", "Notes"],
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

    if (type === "schedule") {
      return [
        {
          title: "Schedule Summary",
          headers: ["User", "Peptide", "Status", "Pattern", "Next Dates", "Dose"],
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
        {
          title: "Schedule By Date",
          headers: ["Date", "User", "Peptide", "Dose", "Pattern"],
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

    if (type === "stack") {
      return [
        {
          title: "Selected Stack Items",
          headers: ["User", "Peptide", "Current Vial", "Schedule", "Stock Source", "Recent Status"],
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

    return [
      {
        title: "Half-Life Stack Inputs",
        headers: ["User", "Peptide", "Half-Life", "Schedule", "Dose Events In Range"],
        rows: halfLifeRows.map(({ peptide, schedule, halfLife, dates }) => [
          userNameById.get(schedule.vaultUserId || peptide.vaultUserId || DEFAULT_VAULT_USER_ID) || "User 1",
          peptide.name,
          `${(halfLife.hours / 24).toFixed(2)} days (${Math.round(halfLife.hours)} hours) - ${halfLife.source}`,
          scheduleLabel(schedule),
          dates.length ? dates.map(formatDate).join(", ") : "--",
        ]),
      },
      {
        title: "Half-Life Curve Summary",
        headers: ["Item", "Half-Life", "Dose Events", "Total Scheduled"],
        rows: halfLifeCurveInputs.map((input) => [
          input.label,
          `${(input.halfLifeHours / 24).toFixed(2)} days`,
          `${input.events.length}`,
          formatMgAmount(input.events.reduce((sum, event) => sum + event.doseMg, 0)),
        ]),
      },
    ];
  };

  const addPdfPageNumbers = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  };

  const drawReportIntoPdf = (doc: jsPDF, type: ReportType, startOnNewPage: boolean) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const generatedAt = new Date().toLocaleString();
    const option = reportOptions.find((item) => item.value === type) || reportOptions[0];
    const userScope = selectedUserId === "all" ? "All users" : userNameById.get(selectedUserId) || "Selected user";
    const dateScope = type === "stock" ? "" : `${formatDate(startDate)} - ${formatDate(endDate)}`;

    if (startOnNewPage) doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`${option.label} Report`, margin, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated ${generatedAt}`, margin, 23);
    doc.text(userScope, pageWidth - margin, 16, { align: "right" });
    if (dateScope) doc.text(dateScope, pageWidth - margin, 23, { align: "right" });

    let y = 34;
    getPdfSections(type).forEach((section) => {
      y = drawPdfTable(doc, section, y);
    });
    if (type === "halfLife") {
      y = drawHalfLifeCurve(doc, halfLifeCurveInputs, startDate, endDate, y);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    drawReportIntoPdf(doc, reportType, false);
    addPdfPageNumbers(doc);
    doc.save(makeFileName(reportInfo.label));
  };

  const handleDownloadBundlePdf = () => {
    if (selectedBundleReports.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    selectedBundleReports.forEach((type, index) => {
      drawReportIntoPdf(doc, type, index > 0);
    });
    addPdfPageNumbers(doc);
    doc.save(makeFileName("Selected Reports"));
  };

  const renderReport = () => {
    if (!isLoaded) {
      return <p style={{ color: "var(--text-secondary)" }}>Loading report data...</p>;
    }
    if (reportType === "stock") return renderStockReport();
    if (reportType === "history") return renderHistoryReport();
    if (reportType === "schedule") return renderScheduleReport();
    if (reportType === "stack") return renderStackReport();
    return renderHalfLifeReport();
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
          <Select
            label="Report"
            value={reportType}
            onChange={(event) => setReportType(event.target.value as ReportType)}
            options={reportOptions.map((option) => ({ value: option.value, label: option.label }))}
          />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", margin: "-8px 0 0", lineHeight: 1.45 }}>
            {reportInfo.description}
          </p>

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

          {reportType !== "stock" && (
            <div className="form-row-grid">
              <Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          )}

          {reportType === "history" && (
            <div>
              <span className="form-label">Statuses</span>
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

          {reportType === "stock" ? (
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
          ) : (
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

          <div
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px",
              background: "var(--bg-input)",
            }}
          >
            <span className="form-label">Report Bundle</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px", marginTop: "10px" }}>
              {reportOptions.map((option) => (
                <label key={option.value} style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.86rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedBundleReports.includes(option.value)}
                    onChange={() => toggleBundleReport(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
            <Button variant="primary" onClick={handleDownloadPdf} disabled={!isLoaded}>
              <Download size={16} />
              Download PDF
            </Button>
            <Button variant="secondary" onClick={handleDownloadBundlePdf} disabled={!isLoaded || selectedBundleReports.length === 0}>
              <Download size={16} />
              Download Selected
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
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card className="export-report-printable">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={20} style={{ color: "var(--color-primary)" }} />
              {reportInfo.label} Report
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", margin: "6px 0 0" }}>
              Generated {new Date().toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            <div>{selectedUserId === "all" ? "All users" : userNameById.get(selectedUserId) || "Selected user"}</div>
            {reportType !== "stock" && (
              <div>
                {formatDate(startDate)} - {formatDate(endDate)}
              </div>
            )}
          </div>
        </div>

        {renderReport()}
      </Card>
    </div>
  );
};
