import React, { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Activity, CalendarDays, Eye, EyeOff, Plus, Trash2, Users } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { db } from "../../db/db";
import { ensureDefaultVaultUser } from "../../db/vaultUsers";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { InjectionLog } from "../../types/injectionLog";
import { DEFAULT_VAULT_USER_ID } from "../../types/vaultUser";
import { PEPTIDE_CATALOG, type PeptideCatalogItem } from "../../utils/peptideCatalog";
import { getBlendDefinitionForCatalogId, getBlendDefinitionForName } from "../../utils/blendDefinitions";
import { isHiddenPeptideCatalogItem } from "../../utils/peptideDetails";
import {
  addDays,
  getDoseScheduleOccurrences,
  getLocalDateString,
  getUpcomingInjectionDates,
  hasDoseSchedule,
  parseLocalDate,
} from "../../utils/dateUtils";

type DoseUnit = "mcg" | "mg" | "IU";
type ScheduleMode = "preset" | "custom" | "weekdays";

type Entry = {
  id: string;
  selectedId: string;
  customName: string;
  halfLifeHours: number | "";
  estimated: boolean;
  dose: number;
  unit: DoseUnit;
  doseEvents?: DoseEvent[];
  startDay: number;
  endDay: number | "";
  scheduleMode: ScheduleMode;
  frequencyDays: number;
  customFrequencyDays: number;
  weekdays: number[];
  visible: boolean;
};

type ChartRow = {
  day: number;
  values: Record<string, number>;
  combined: number;
};

type DoseEvent = {
  day: number;
  dose: number;
  unit: DoseUnit;
  date: string;
};

type ToolMode = "single" | "stack";

const colors = [
  "#2476a8",
  "#35b58d",
  "#c56f4b",
  "#7568b8",
  "#d49a27",
  "#1f8a93",
  "#8a5a44",
  "#d9468f",
  "#5b8f2f",
  "#e05d44",
  "#3f8fd2",
  "#8f6a1f",
  "#2f9f9f",
  "#9b5fc0",
];
const manualCurveLimit = 7;
const decayLookbackHalfLives = 15;
const timelineOptions = [7, 14, 30, 60, 90];
const frequencies = [
  { label: "Once", days: 0 },
  { label: "Daily", days: 1 },
  { label: "Every 2 days", days: 2 },
  { label: "Twice weekly", days: 3.5 },
  { label: "Weekly", days: 7 },
];
const weekdays = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];
const selectablePeptides = PEPTIDE_CATALOG.filter(
  (peptide) => Boolean(peptide.normalizedHalfLifeHours) && !isHiddenPeptideCatalogItem(peptide)
).sort((a, b) => a.name.localeCompare(b.name));

const catalogBySearchName = new Map<string, PeptideCatalogItem>();
for (const peptide of PEPTIDE_CATALOG) {
  [peptide.name, peptide.originalProduct, ...peptide.alternateNames].forEach((name) => {
    if (name) catalogBySearchName.set(normalizeSearchName(name), peptide);
  });
}

function normalizeSearchName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits)).toString();
}

function doseToMg(dose: number, unit: DoseUnit) {
  if (unit === "mcg") return dose / 1000;
  return dose;
}

function doseFromMg(doseMg: number, unit: DoseUnit) {
  if (unit === "mcg") return doseMg * 1000;
  return doseMg;
}

function scheduleDoseCount(entry: Entry) {
  if (entry.scheduleMode === "weekdays") return Math.max(entry.weekdays.length, 1);
  if (entry.scheduleMode === "custom") return 7 / Math.max(entry.customFrequencyDays, 0.1);
  if (!entry.frequencyDays) return 1;
  return 7 / entry.frequencyDays;
}

function weeklyTotalLabel(entry: Entry) {
  if (entry.scheduleMode === "preset" && !entry.frequencyDays) {
    return `${formatNumber(entry.dose, 3)} ${entry.unit} once`;
  }
  return `${formatNumber(entry.dose * scheduleDoseCount(entry), 3)} ${entry.unit} per week`;
}

function perDoseLabel(entry: Entry) {
  return `${formatNumber(doseFromMg(doseToMg(entry.dose, entry.unit), entry.unit), 3)} ${entry.unit} per dose`;
}

function formatMgAmount(valueMg: number) {
  if (valueMg > 0 && valueMg < 1) return `${formatNumber(valueMg * 1000, 2)} mcg`;
  return `${formatNumber(valueMg, 2)} mg`;
}

function formatDayLabel(day: number) {
  if (day === 0) return "Today";
  return day > 0 ? `+${Math.round(day)}d` : `${Math.round(day)}d`;
}

function daysBetween(startDateStr: string, endDateStr: string) {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function isDoseDay(entry: Entry, doseDay: number) {
  if (entry.scheduleMode !== "weekdays") return true;
  return entry.weekdays.includes(((Math.floor(doseDay) % 7) + 7) % 7);
}

function createEntry(id: string, label: string, peptide?: PeptideCatalogItem): Entry {
  return {
    id,
    selectedId: peptide?.id ?? "",
    customName: peptide?.name ?? label,
    halfLifeHours: peptide?.normalizedHalfLifeHours ?? "",
    estimated: Boolean(peptide?.estimatedHalfLife),
    dose: 100,
    unit: "mcg",
    startDay: 0,
    endDay: "",
    scheduleMode: "preset",
    frequencyDays: 1,
    customFrequencyDays: 5,
    weekdays: [0],
    visible: true,
  };
}

function comparisonRows(entry: Entry) {
  if (entry.doseEvents?.length) return [];
  if (!entry.halfLifeHours || entry.dose <= 0) return [];
  const weeklyTotalMg = doseToMg(entry.dose, entry.unit) * scheduleDoseCount(entry);
  const customDays = Math.max(entry.customFrequencyDays, 0.1);
  const schedules = [
    { name: "Daily", description: "Every day", intervals: [1], doseEachMg: weeklyTotalMg / 7 },
    { name: "Twice Weekly", description: "Split 3 / 4 days", intervals: [3, 4], doseEachMg: weeklyTotalMg / 2 },
    { name: "Weekly", description: "Every 7 days", intervals: [7], doseEachMg: weeklyTotalMg },
    {
      name: `Every ${formatNumber(customDays, 2)} Days`,
      description: `Every ${formatNumber(customDays, 2)} days`,
      intervals: [customDays],
      doseEachMg: weeklyTotalMg / (7 / customDays),
    },
  ];

  return schedules.map((schedule) => {
    const halfLifeDays = Number(entry.halfLifeHours) / 24;
    const decay = Math.log(2) / halfLifeDays;
    const simDays = Math.max(180, halfLifeDays * 12);
    const doseDays: number[] = [];
    let cursor = 0;
    let intervalIndex = 0;

    while (cursor <= simDays) {
      doseDays.push(cursor);
      cursor += schedule.intervals[intervalIndex % schedule.intervals.length];
      intervalIndex += 1;
    }

    const activityAt = (time: number) =>
      doseDays.reduce((total, doseDay) => {
        if (doseDay > time) return total;
        return total + schedule.doseEachMg * Math.exp(-decay * (time - doseDay));
      }, 0);

    const windowStart = simDays - 28;
    const samples: number[] = [];
    for (let time = windowStart; time <= simDays; time += 0.1) samples.push(activityAt(time));
    doseDays
      .filter((doseDay) => doseDay >= windowStart && doseDay <= simDays)
      .forEach((doseDay) => {
        samples.push(activityAt(Math.max(windowStart, doseDay - 0.001)));
        samples.push(activityAt(doseDay));
      });

    const averageInterval = schedule.intervals.reduce((sum, interval) => sum + interval, 0) / schedule.intervals.length;
    const daysToSteadyState = -Math.log(0.05) / decay;

    return {
      ...schedule,
      steadyStatePeakMg: Math.max(...samples),
      troughMg: Math.min(...samples),
      dailyAverageMg: samples.reduce((sum, sample) => sum + sample, 0) / samples.length,
      injectionsToSteadyState: Math.ceil(daysToSteadyState / averageInterval),
    };
  });
}

function buildChartData(entries: Entry[], startDay: number, endDay: number): ChartRow[] {
  const rows: ChartRow[] = [];
  const days = Math.max(1, endDay - startDay);
  const step = days <= 14 ? 0.25 : days <= 30 ? 0.5 : 1;

  for (let day = startDay; day <= endDay; day += step) {
    const values: Record<string, number> = {};
    let total = 0;

    entries.forEach((entry) => {
      if (!entry.visible || !entry.halfLifeHours || entry.dose <= 0) {
        values[entry.id] = 0;
        return;
      }

      const halfLifeDays = Number(entry.halfLifeHours) / 24;
      const earliestRelevantDoseDay = day - halfLifeDays * decayLookbackHalfLives;
      let activity = 0;

      if (entry.doseEvents?.length) {
        for (const event of entry.doseEvents) {
          const elapsed = day - event.day;
          if (elapsed >= 0 && event.day >= earliestRelevantDoseDay) {
            activity += doseToMg(event.dose, event.unit) * Math.pow(0.5, elapsed / halfLifeDays);
          }
        }
      } else {
        const doseMg = doseToMg(entry.dose, entry.unit);
        const increment =
          entry.scheduleMode === "weekdays"
            ? 1
            : entry.scheduleMode === "custom"
              ? entry.customFrequencyDays
              : entry.frequencyDays || days + 1;
        const finalDoseDay = entry.endDay === "" ? day : Math.min(day, entry.endDay);
        const firstDoseDay =
          increment > 0 && earliestRelevantDoseDay > entry.startDay
            ? entry.startDay + Math.ceil((earliestRelevantDoseDay - entry.startDay) / increment) * increment
            : entry.startDay;

        for (let doseDay = firstDoseDay; doseDay <= finalDoseDay; doseDay += increment) {
          if (!isDoseDay(entry, doseDay)) continue;
          const elapsed = day - doseDay;
          if (elapsed >= 0) activity += doseMg * Math.pow(0.5, elapsed / halfLifeDays);
          if (entry.scheduleMode === "preset" && !entry.frequencyDays) break;
        }
      }

      values[entry.id] = Number(activity.toFixed(4));
      total += activity;
    });

    rows.push({ day: Number(day.toFixed(2)), values, combined: Number(total.toFixed(4)) });
  }

  return rows;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-group" style={{ marginBottom: 0 }}>
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "10px",
        background: "var(--bg-input)",
      }}
    >
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800 }}>
        {label}
      </p>
      <p style={{ marginTop: "4px", fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 800 }}>{value}</p>
    </div>
  );
}

function HalfLifeChart({
  chartData,
  entries,
  startDay,
  endDay,
  combined,
}: {
  chartData: ChartRow[];
  entries: Entry[];
  startDay: number;
  endDay: number;
  combined: boolean;
}) {
  const [hoveredRow, setHoveredRow] = useState<ChartRow | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const width = 420;
  const height = 260;
  const padding = { top: 18, right: 18, bottom: 34, left: 74 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const timelineDays = Math.max(1, endDay - startDay);
  const visibleEntries = entries.filter((entry) => entry.visible);
  const maxValue = Math.max(
    0.01,
    ...chartData.flatMap((row) => [
      ...visibleEntries.map((entry) => row.values[entry.id] ?? 0),
      combined ? row.combined : 0,
    ])
  );
  const yMax = maxValue * 1.12;
  const xScale = (day: number) => padding.left + ((day - startDay) / timelineDays) * plotWidth;
  const yScale = (value: number) => padding.top + plotHeight - (value / yMax) * plotHeight;
  const buildPath = (valueForRow: (row: ChartRow) => number) =>
    chartData
      .map((row) => ({ x: xScale(row.day), y: yScale(valueForRow(row)) }))
      .map((point, index, points) => {
        if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        const previous = points[index - 1];
        const next = points[index + 1] ?? point;
        const controlX = previous.x + (point.x - previous.x) / 2;
        const previousControlY = previous.y + (point.y - previous.y) / 6;
        const nextControlY = point.y - (next.y - previous.y) / 6;
        return `C ${controlX.toFixed(2)} ${previousControlY.toFixed(2)}, ${controlX.toFixed(2)} ${nextControlY.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * yMax);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => startDay + ratio * timelineDays);
  const hoveredX = hoveredRow ? xScale(hoveredRow.day) : null;
  const todayX = startDay <= 0 && endDay >= 0 ? xScale(0) : null;

  return (
    <div style={{ width: "100%", overflow: "hidden", position: "relative" }}>
      <svg
        role="img"
        aria-label="Half-life concentration graph"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
          const plotX = Math.min(Math.max(svgX, padding.left), width - padding.right);
          const day = startDay + ((plotX - padding.left) / plotWidth) * timelineDays;
          const nearest = chartData.reduce((best, row) =>
            Math.abs(row.day - day) < Math.abs(best.day - day) ? row : best
          );
          setHoveredRow(nearest);
          setHoverPoint({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          });
        }}
        onMouseLeave={() => {
          setHoveredRow(null);
          setHoverPoint(null);
        }}
        style={{
          width: "100%",
          height: "300px",
          display: "block",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          background: "rgba(9, 10, 15, 0.55)",
        }}
      >
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />
              <text x={55} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                {formatNumber(tick, 3)}
              </text>
            </g>
          );
        })}
        <text
          x={14}
          y={padding.top + plotHeight / 2}
          fill="var(--text-muted)"
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90 14 ${padding.top + plotHeight / 2})`}
        >
          Concentration
        </text>
        {xTicks.map((tick) => {
          const x = xScale(tick);
          return (
            <g key={`x-${tick}`}>
              <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} stroke="rgba(255,255,255,0.04)" />
              <text x={x - 8} y={height - 11} fill="var(--text-muted)" fontSize="10">
                {formatDayLabel(tick)}
              </text>
            </g>
          );
        })}
        {todayX !== null && (
          <g>
            <line
              x1={todayX}
              x2={todayX}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="rgba(245, 158, 11, 0.7)"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
            <text x={todayX + 5} y={padding.top + 12} fill="var(--color-warning)" fontSize="10" fontWeight="700">
              Today
            </text>
          </g>
        )}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="rgba(255,255,255,0.18)" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="rgba(255,255,255,0.18)" />
        {entries.map((entry, index) =>
          entry.visible ? (
            <path
              key={entry.id}
              d={buildPath((row) => row.values[entry.id] ?? 0)}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null
        )}
        {combined && (
          <path
            d={buildPath((row) => row.combined)}
            fill="none"
            stroke="#f8fafc"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {hoveredRow && hoveredX !== null && (
          <g pointerEvents="none">
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="rgba(248,250,252,0.42)"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {entries.map((entry, index) =>
              entry.visible ? (
                <circle
                  key={`${entry.id}-hover-dot`}
                  cx={hoveredX}
                  cy={yScale(hoveredRow.values[entry.id] ?? 0)}
                  r="3.5"
                  fill={colors[index % colors.length]}
                  stroke="var(--bg-base)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null
            )}
            {combined && (
              <circle
                cx={hoveredX}
                cy={yScale(hoveredRow.combined)}
                r="4"
                fill="var(--text-primary)"
                stroke="var(--bg-base)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        )}
      </svg>
      {hoveredRow && hoverPoint && (
        <div
          style={{
            position: "absolute",
            top: `${Math.max(8, Math.min(hoverPoint.y + 14, 178))}px`,
            left: `${Math.max(8, Math.min(hoverPoint.x + 14, 230))}px`,
            zIndex: 2,
            minWidth: "160px",
            padding: "10px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            background: "var(--bg-modal)",
            boxShadow: "var(--shadow-md)",
            pointerEvents: "none",
          }}
        >
          <p style={{ marginBottom: "6px", color: "var(--text-primary)", fontWeight: 900, fontSize: "0.82rem" }}>
            {formatDayLabel(hoveredRow.day)}
          </p>
          {entries.map((entry, index) =>
            entry.visible ? (
              <div key={`${entry.id}-tooltip`} style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "0.76rem" }}>
                <span style={{ color: colors[index % colors.length], fontWeight: 800 }}>
                  {entry.customName || `Peptide ${index + 1}`}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{formatMgAmount(hoveredRow.values[entry.id] ?? 0)}</span>
              </div>
            ) : null
          )}
          {combined && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "4px", fontSize: "0.76rem" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 900 }}>Combined</span>
              <span style={{ color: "var(--text-secondary)" }}>{formatMgAmount(hoveredRow.combined)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function findCatalogMatch(peptide: Peptide) {
  return catalogBySearchName.get(normalizeSearchName(peptide.name));
}

function getPeptideHalfLife(peptide: Peptide) {
  if (peptide.halfLifeHours && peptide.halfLifeHours > 0) {
    return {
      hours: peptide.halfLifeUnit === "days" ? peptide.halfLifeHours * 24 : peptide.halfLifeHours,
      estimated: false,
      selectedId: findCatalogMatch(peptide)?.id ?? "",
    };
  }

  const catalogMatch = findCatalogMatch(peptide);
  if (catalogMatch?.normalizedHalfLifeHours) {
    return {
      hours: catalogMatch.normalizedHalfLifeHours,
      estimated: catalogMatch.estimatedHalfLife,
      selectedId: catalogMatch.id,
    };
  }

  return null;
}

function makeStackEntry({
  id,
  name,
  halfLife,
  doseEvents,
  fallbackFrequencyDays,
}: {
  id: string;
  name: string;
  halfLife: { hours: number; estimated: boolean; selectedId: string };
  doseEvents: DoseEvent[];
  fallbackFrequencyDays: number;
}): Entry | null {
  const sortedEvents = doseEvents.sort((a, b) => a.day - b.day || a.date.localeCompare(b.date));
  if (sortedEvents.length === 0) return null;

  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  return {
    id,
    selectedId: halfLife.selectedId,
    customName: name,
    halfLifeHours: halfLife.hours,
    estimated: halfLife.estimated,
    dose: firstEvent.dose,
    unit: firstEvent.unit,
    doseEvents: sortedEvents,
    startDay: firstEvent.day,
    endDay: lastEvent.day,
    scheduleMode: "preset",
    frequencyDays: fallbackFrequencyDays,
    customFrequencyDays: fallbackFrequencyDays,
    weekdays: [],
    visible: true,
  };
}

function buildStackEntries({
  userId,
  peptides,
  schedules,
  logs,
  todayStr,
  startDateStr,
  endDateStr,
}: {
  userId: string;
  peptides: Peptide[];
  schedules: PeptideSchedule[];
  logs: InjectionLog[];
  todayStr: string;
  startDateStr: string;
  endDateStr: string;
}) {
  const peptidesById = new Map(peptides.map((peptide) => [peptide.id, peptide]));
  const relevantSchedules = schedules.filter((schedule) => schedule.isActive && (schedule.vaultUserId || DEFAULT_VAULT_USER_ID) === userId);
  const skipped: string[] = [];

  const entries = relevantSchedules
    .flatMap((schedule): Entry[] => {
      const peptide = peptidesById.get(schedule.peptideId);
      if (!peptide) return [];

      const halfLife = getPeptideHalfLife(peptide);
      const catalogMatch = findCatalogMatch(peptide);
      const blendDefinition = (catalogMatch ? getBlendDefinitionForCatalogId(catalogMatch.id) : undefined) || getBlendDefinitionForName(peptide.name);
      if (!halfLife && !blendDefinition) {
        skipped.push(peptide.name);
        return [];
      }

      const eventsByKey = new Map<string, DoseEvent>();
      const addEvent = (date: string, dose: number, unit: DoseUnit, key = date) => {
        if (date < startDateStr || date > endDateStr || dose <= 0) return;
        eventsByKey.set(key, {
          date,
          day: daysBetween(todayStr, date),
          dose,
          unit,
        });
      };

      const futureStartStr = startDateStr < todayStr ? todayStr : startDateStr;

      if (hasDoseSchedule(schedule)) {
        const phaseStart = schedule.doseScheduleStartDate || schedule.startDate || schedule.lastInjectionDate || futureStartStr;
        for (const occurrence of getDoseScheduleOccurrences(schedule, phaseStart, endDateStr)) {
          if (occurrence.date < futureStartStr) continue;
          addEvent(occurrence.date, occurrence.phase.doseValue, occurrence.phase.doseUnit);
        }
      } else {
        for (const date of getUpcomingInjectionDates(schedule, futureStartStr, endDateStr)) {
          addEvent(date, peptide.desiredDoseValue, peptide.desiredDoseUnit);
        }
      }

      logs
        .filter(
          (log) =>
            log.peptideId === peptide.id &&
            (log.vaultUserId || DEFAULT_VAULT_USER_ID) === userId &&
            log.scheduledDate >= startDateStr &&
            log.scheduledDate <= endDateStr
        )
        .forEach((log) => {
          if (log.status === "skipped" || log.status === "missed") {
            eventsByKey.delete(log.scheduledDate);
            return;
          }
          if (log.status === "taken") {
            addEvent(log.scheduledDate, log.doseValue, log.doseUnit, log.scheduledDate);
            return;
          }
          if (log.status === "manual") {
            addEvent(log.scheduledDate, log.doseValue, log.doseUnit, log.scheduledDate);
          }
        });

      const doseEvents = Array.from(eventsByKey.values()).sort((a, b) => a.day - b.day || a.date.localeCompare(b.date));
      if (doseEvents.length === 0) return [];

      if (blendDefinition) {
        const totalParts = blendDefinition.components.reduce((sum, component) => sum + component.parts, 0);
        return blendDefinition.components
          .map((component) => {
            const componentCatalog = PEPTIDE_CATALOG.find((item) => item.id === component.peptideCatalogId);
            if (!componentCatalog?.normalizedHalfLifeHours || totalParts <= 0) {
              skipped.push(`${peptide.name} - ${componentCatalog?.name || component.peptideCatalogId}`);
              return null;
            }

            const componentEvents = doseEvents.map((event) => ({
              ...event,
              dose: Number(((event.dose * component.parts) / totalParts).toFixed(6)),
            }));

            return makeStackEntry({
              id: `stack-${schedule.id}-${component.peptideCatalogId}`,
              name: `${blendDefinition.displayName} - ${componentCatalog.name}`,
              halfLife: {
                hours: componentCatalog.normalizedHalfLifeHours,
                estimated: componentCatalog.estimatedHalfLife,
                selectedId: componentCatalog.id,
              },
              doseEvents: componentEvents,
              fallbackFrequencyDays: schedule.intervalDays || 1,
            });
          })
          .filter((entry): entry is Entry => Boolean(entry));
      }

      const entry = halfLife
        ? makeStackEntry({
            id: `stack-${schedule.id}`,
            name: peptide.name,
            halfLife,
            doseEvents,
            fallbackFrequencyDays: schedule.intervalDays || 1,
          })
        : null;
      return entry ? [entry] : [];
    })

  return { entries, skipped };
}

export const MultiHalfLifeTool: React.FC = () => {
  const firstPeptide = selectablePeptides[0];
  const [entries, setEntries] = useState<Entry[]>([createEntry("entry-1", "Custom peptide", firstPeptide)]);
  const [mode, setMode] = useState<ToolMode>("single");
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_VAULT_USER_ID);
  const [stackMessage, setStackMessage] = useState("");
  const [days, setDays] = useState(30);
  const [combined, setCombined] = useState(false);
  const vaultUsers = useLiveQuery(() => db.vaultUsers.orderBy("sortOrder").toArray());
  const peptides = useLiveQuery(() => db.peptides.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray());
  const logs = useLiveQuery(() => db.injectionLogs.toArray());
  const activeVaultUsers = useMemo(() => vaultUsers?.filter((user) => !user.isArchived) || [], [vaultUsers]);
  const effectiveSelectedUserId = activeVaultUsers.some((user) => user.id === selectedUserId)
    ? selectedUserId
    : activeVaultUsers[0]?.id || DEFAULT_VAULT_USER_ID;
  const timelineStartDay = mode === "stack" ? -30 : 0;
  const timelineEndDay = mode === "stack" ? 60 : days;
  const chartData = useMemo(() => buildChartData(entries, timelineStartDay, timelineEndDay), [entries, timelineStartDay, timelineEndDay]);

  useEffect(() => {
    void ensureDefaultVaultUser();
  }, []);

  function updateEntry(id: string, patch: Partial<Entry>) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function selectPeptide(entryId: string, peptideId: string) {
    const peptide = selectablePeptides.find((item) => item.id === peptideId);
    updateEntry(entryId, {
      selectedId: peptideId,
      customName: peptide?.name ?? "",
      halfLifeHours: peptide?.normalizedHalfLifeHours ?? "",
      estimated: Boolean(peptide?.estimatedHalfLife),
    });
  }

  function addEntry() {
    if (mode !== "single" || entries.length >= manualCurveLimit) return;
    const nextPeptide = selectablePeptides[entries.length % Math.max(selectablePeptides.length, 1)];
    setEntries((current) => [
      ...current,
      createEntry(`entry-${Date.now()}`, nextPeptide?.name ?? `Peptide ${current.length + 1}`, nextPeptide),
    ]);
  }

  function changeFrequency(entry: Entry, nextFrequencyDays: number) {
    const currentWeeklyTotal = entry.dose * scheduleDoseCount(entry);
    const nextCount = nextFrequencyDays ? 7 / nextFrequencyDays : 1;
    updateEntry(entry.id, {
      scheduleMode: "preset",
      frequencyDays: nextFrequencyDays,
      dose: Number((currentWeeklyTotal / nextCount).toFixed(4)),
    });
  }

  function changeFrequencyChoice(entry: Entry, choice: string) {
    if (choice === "custom") {
      const currentWeeklyTotal = entry.dose * scheduleDoseCount(entry);
      const nextCount = 7 / Math.max(entry.customFrequencyDays, 0.1);
      updateEntry(entry.id, {
        scheduleMode: "custom",
        dose: Number((currentWeeklyTotal / nextCount).toFixed(4)),
      });
      return;
    }

    if (choice === "weekdays") {
      const currentWeeklyTotal = entry.dose * scheduleDoseCount(entry);
      const nextCount = Math.max(entry.weekdays.length, 1);
      updateEntry(entry.id, {
        scheduleMode: "weekdays",
        dose: Number((currentWeeklyTotal / nextCount).toFixed(4)),
      });
      return;
    }

    changeFrequency(entry, Number(choice));
  }

  function changeCustomFrequency(entry: Entry, nextFrequencyDays: number) {
    const safeNextFrequencyDays = Math.max(nextFrequencyDays, 0.1);
    const currentWeeklyTotal = entry.dose * scheduleDoseCount(entry);
    updateEntry(entry.id, {
      scheduleMode: "custom",
      customFrequencyDays: safeNextFrequencyDays,
      dose: Number((currentWeeklyTotal / (7 / safeNextFrequencyDays)).toFixed(4)),
    });
  }

  function toggleWeekday(entry: Entry, weekday: number) {
    const currentWeeklyTotal = entry.dose * scheduleDoseCount(entry);
    const nextWeekdays = entry.weekdays.includes(weekday)
      ? entry.weekdays.filter((day) => day !== weekday)
      : [...entry.weekdays, weekday].sort((a, b) => a - b);
    if (nextWeekdays.length === 0) return;
    updateEntry(entry.id, {
      scheduleMode: "weekdays",
      weekdays: nextWeekdays,
      dose: Number((currentWeeklyTotal / nextWeekdays.length).toFixed(4)),
    });
  }

  function loadSelectedUserStack() {
    const todayStr = getLocalDateString();
    const startDateStr = addDays(todayStr, -30);
    const endDateStr = addDays(todayStr, 60);
    const result = buildStackEntries({
      userId: effectiveSelectedUserId,
      peptides: peptides || [],
      schedules: schedules || [],
      logs: logs || [],
      todayStr,
      startDateStr,
      endDateStr,
    });

    if (result.entries.length === 0) {
      setStackMessage(
        result.skipped.length > 0
          ? `No graphable stack items found. Missing half-life data for ${result.skipped.join(", ")}.`
          : "No active scheduled stack items found for this user."
      );
      return;
    }

    setEntries(result.entries);
    setStackMessage(
      `Loaded ${result.entries.length} curve${result.entries.length === 1 ? "" : "s"} from ${formatDayLabel(-30)} to ${formatDayLabel(60)}.${
        result.skipped.length > 0 ? ` Missing half-life data for ${result.skipped.join(", ")}.` : ""
      }`
    );
  }

  return (
    <div className="fade-in" style={{ display: "grid", gap: "14px" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-primary)" }}>
              <Activity size={18} />
              <p style={{ fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase" }}>Half-Life</p>
            </div>
            <h2 style={{ marginTop: "6px", fontSize: "1.2rem" }}>
              {mode === "stack" ? "Stack timeline" : "Multi-peptide tracker"}
            </h2>
            <p style={{ marginTop: "4px", color: "var(--text-secondary)", fontSize: "0.86rem" }}>
              {mode === "stack"
                ? "Load a user stack and view estimated concentration from 30 days back through 60 days ahead."
                : "Compare curves, schedules, and estimated build-up over time."}
            </p>
          </div>
          <Button variant={combined ? "success" : "secondary"} onClick={() => setCombined((value) => !value)} style={{ flex: "0 0 auto" }}>
            Combined
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", marginTop: "14px" }}>
          {([
            { value: "single", label: "Single / manual", Icon: Activity },
            { value: "stack", label: "Stack timeline", Icon: CalendarDays },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setStackMessage("");
              }}
              className="btn"
              style={{
                minHeight: "42px",
                padding: "8px",
                borderColor: mode === value ? "var(--border-color-focus)" : "var(--border-color)",
                background: mode === value ? "var(--bg-active-soft)" : "var(--bg-input)",
                color: mode === value ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "0.78rem",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "6px", marginTop: "14px" }}>
            {timelineOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className="btn"
                style={{
                  minHeight: "38px",
                  padding: "8px 4px",
                  borderColor: days === option ? "var(--border-color-focus)" : "var(--border-color)",
                  background: days === option ? "var(--bg-active-soft)" : "var(--bg-input)",
                  color: days === option ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: "0.76rem",
                }}
              >
                {option}d
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px" }}>
              <label className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">User</span>
                <select
                  value={effectiveSelectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="form-control"
                  disabled={!vaultUsers}
                >
                  {activeVaultUsers.map((user) => (
                    <option key={user.id} value={user.id} style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="primary"
                onClick={loadSelectedUserStack}
                disabled={!peptides || !schedules || !logs}
                style={{ alignSelf: "end", minHeight: "46px" }}
              >
                <Users size={17} />
                Load
              </Button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
              }}
            >
              <MiniMetric label="Start" value="-30 days" />
              <MiniMetric label="Today" value={getLocalDateString()} />
              <MiniMetric label="End" value="+60 days" />
            </div>
            {stackMessage && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                {stackMessage}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <HalfLifeChart chartData={chartData} entries={entries} startDay={timelineStartDay} endDay={timelineEndDay} combined={combined} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginTop: "12px" }}>
          {entries.map((entry, index) => (
            <div
              key={`${entry.id}-method`}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "10px",
                opacity: entry.visible ? 1 : 0.55,
                background: "var(--bg-input)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: colors[index % colors.length],
                    flex: "0 0 auto",
                  }}
                />
                <p style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 800 }}>
                  {entry.customName || `Peptide ${index + 1}`}
                </p>
              </div>
              <p style={{ marginTop: "6px", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                {perDoseLabel(entry)}. {entry.doseEvents?.length ? `${entry.doseEvents.length} projected doses in view.` : `${weeklyTotalLabel(entry)}.`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {entries.map((entry, index) => {
        const selected = selectablePeptides.find((peptide) => peptide.id === entry.selectedId);
        const comparisons = comparisonRows(entry);

        return (
          <Card key={entry.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: colors[index % colors.length], fontSize: "0.76rem", fontWeight: 900, textTransform: "uppercase" }}>
                  Curve {index + 1}
                </p>
                <h3 style={{ fontSize: "1.05rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.customName || `Peptide ${index + 1}`}
                </h3>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  title={entry.visible ? "Hide curve" : "Show curve"}
                  onClick={() => updateEntry(entry.id, { visible: !entry.visible })}
                  className="btn btn-secondary"
                  style={{ width: "40px", height: "40px", padding: 0 }}
                >
                  {entry.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                {entries.length > 1 && (
                  <button
                    type="button"
                    title="Remove curve"
                    onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}
                    className="btn btn-danger"
                    style={{ width: "40px", height: "40px", padding: 0 }}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
              <Field label="Peptide">
                <select value={entry.selectedId} onChange={(event) => selectPeptide(entry.id, event.target.value)} className="form-control">
                  <option value="">Custom / unknown</option>
                  {selectablePeptides.map((peptide) => (
                    <option key={peptide.id} value={peptide.id} style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>
                      {peptide.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-row-grid">
                <Field label="Half-life hours">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={entry.halfLifeHours}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        halfLifeHours: event.target.value === "" ? "" : Number(event.target.value),
                        estimated: false,
                      })
                    }
                    className="form-control"
                  />
                </Field>
                <Field label="Start day">
                  <input
                    type="number"
                    min="0"
                    value={entry.startDay}
                    onChange={(event) => updateEntry(entry.id, { startDay: Number(event.target.value) })}
                    className="form-control"
                  />
                </Field>
              </div>
              <div>
                <p className="form-label" style={{ marginBottom: "8px" }}>
                  Dose & Frequency
                </p>
                {entry.doseEvents?.length ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      background: "var(--bg-input)",
                    }}
                  >
                    <p style={{ color: "var(--text-primary)", fontSize: "0.88rem", fontWeight: 900 }}>
                      Loaded from stack schedule
                    </p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                      {entry.doseEvents.length} projected doses in this -30 to +60 day view. Dose amounts come from the saved schedule phases and logs.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: "8px" }}>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>
                        Dose
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={entry.dose}
                        onChange={(event) => updateEntry(entry.id, { dose: Number(event.target.value) })}
                        className="form-control"
                        aria-label={`${entry.customName || `Peptide ${index + 1}`} dose amount`}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>
                        Unit
                      </span>
                      <select
                        value={entry.unit}
                        onChange={(event) => updateEntry(entry.id, { unit: event.target.value as DoseUnit })}
                        className="form-control"
                        aria-label={`${entry.customName || `Peptide ${index + 1}`} dose unit`}
                      >
                        <option style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>mcg</option>
                        <option style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>mg</option>
                        <option style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>IU</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>
                        Frequency
                      </span>
                      <select
                        value={
                          entry.scheduleMode === "custom"
                            ? "custom"
                            : entry.scheduleMode === "weekdays"
                              ? "weekdays"
                              : String(entry.frequencyDays)
                        }
                        onChange={(event) => changeFrequencyChoice(entry, event.target.value)}
                        className="form-control"
                        aria-label={`${entry.customName || `Peptide ${index + 1}`} dosing frequency`}
                      >
                        {frequencies.map((frequency) => (
                          <option key={frequency.label} value={frequency.days} style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>
                            {frequency.label}
                          </option>
                        ))}
                        <option value="custom" style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>
                          Every X days
                        </option>
                        <option value="weekdays" style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}>
                          Day of week
                        </option>
                      </select>
                    </label>
                  </div>
                )}
                {!entry.doseEvents?.length && entry.scheduleMode === "custom" && (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>
                        Every X days
                      </span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={entry.customFrequencyDays}
                        onChange={(event) => changeCustomFrequency(entry, Number(event.target.value))}
                        className="form-control"
                      />
                    </label>
                  </div>
                )}
                {!entry.doseEvents?.length && entry.scheduleMode === "weekdays" && (
                  <div style={{ marginTop: "10px" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
                      Days of week
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "5px" }}>
                      {weekdays.map((weekday) => (
                        <button
                          key={weekday.value}
                          type="button"
                          onClick={() => toggleWeekday(entry, weekday.value)}
                          className="btn"
                          style={{
                            minHeight: "36px",
                            padding: "6px 2px",
                            fontSize: "0.72rem",
                            borderColor: entry.weekdays.includes(weekday.value) ? "rgba(16, 185, 129, 0.5)" : "var(--border-color)",
                            background: entry.weekdays.includes(weekday.value) ? "var(--bg-active-soft)" : "var(--bg-input)",
                            color: entry.weekdays.includes(weekday.value) ? "var(--text-primary)" : "var(--text-secondary)",
                          }}
                        >
                          {weekday.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!entry.doseEvents?.length && (
                <Field label="End day">
                  <input
                    type="number"
                    min="0"
                    placeholder="No end"
                    value={entry.endDay}
                    onChange={(event) => updateEntry(entry.id, { endDay: event.target.value === "" ? "" : Number(event.target.value) })}
                    className="form-control"
                  />
                </Field>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginTop: "14px" }}>
              <MiniMetric label="Per Dose" value={perDoseLabel(entry)} />
              <MiniMetric
                label={entry.doseEvents?.length ? "Timeline" : "Weekly"}
                value={entry.doseEvents?.length ? `${entry.doseEvents.length} projected doses` : weeklyTotalLabel(entry)}
              />
              <MiniMetric label="Catalog" value={selected?.halfLifeDisplay ?? "Manual"} />
            </div>
            {entry.estimated && (
              <p style={{ marginTop: "10px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                This catalog half-life is marked estimated and can be edited.
              </p>
            )}

            {!entry.doseEvents?.length && (
              <div style={{ marginTop: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ padding: "10px 12px", background: "var(--bg-active-soft)" }}>
                  <p style={{ fontWeight: 900 }}>Schedule comparison</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Based on {weeklyTotalLabel(entry)}</p>
                </div>
                {comparisons.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>
                        <tr>
                          <th style={{ textAlign: "left", padding: "9px" }}>Schedule</th>
                          <th style={{ textAlign: "left", padding: "9px" }}>Dose each</th>
                          <th style={{ textAlign: "left", padding: "9px" }}>Steady state</th>
                          <th style={{ textAlign: "left", padding: "9px" }}>Low at SS</th>
                          <th style={{ textAlign: "left", padding: "9px" }}>Daily avg</th>
                          <th style={{ textAlign: "left", padding: "9px" }}>Inj. to SS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisons.map((comparison) => (
                          <tr key={comparison.name} style={{ borderTop: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "9px" }}>
                              <p style={{ fontWeight: 800 }}>{comparison.name}</p>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{comparison.description}</p>
                            </td>
                            <td style={{ padding: "9px", fontWeight: 800 }}>{formatMgAmount(comparison.doseEachMg)}</td>
                            <td style={{ padding: "9px", color: "var(--text-secondary)" }}>{formatMgAmount(comparison.steadyStatePeakMg)}</td>
                            <td style={{ padding: "9px", color: "var(--text-secondary)" }}>{formatMgAmount(comparison.troughMg)}</td>
                            <td style={{ padding: "9px", color: "var(--text-secondary)" }}>{formatMgAmount(comparison.dailyAverageMg)}</td>
                            <td style={{ padding: "9px", color: "var(--text-secondary)" }}>{comparison.injectionsToSteadyState}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.84rem" }}>
                    Enter a dose and half-life to calculate schedule comparisons.
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {mode === "single" && (
        <Button variant="primary" onClick={addEntry} disabled={entries.length >= manualCurveLimit} fullWidth>
          <Plus size={17} />
          Add peptide curve
        </Button>
      )}
    </div>
  );
};
