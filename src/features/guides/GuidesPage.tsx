import React, { useState } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { PRELOADED_PEPTIDES } from "../../utils/peptideList";
import { getPeptideHalfLifeHours, getPeptideProfile, hasJsonPeptideProfile } from "../../utils/peptideDetails";
import { normalizeDoseToMcg } from "../calculator/calculatorUtils";
import type { DoseUnit, HalfLifeUnit } from "../../types/peptide";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Info,
  Droplet,
  FileText,
  Activity
} from "lucide-react";

type HalfLifeEstimate = {
  value: number;
  unit: HalfLifeUnit;
  hours: number;
};

type HalfLifePoint = {
  dayOffset: number;
  amountMcg: number;
};

type HalfLifeFrequency = "daily" | "everyXDays" | "weekly";

type SteadyStateMetrics = {
  steadyStateMcg: number;
  lowAtSteadyStateMcg: number;
  dailyAverageMcg: number;
  injectionsToSteadyState: number;
  daysToShow: number;
};

type ComparisonRow = {
  label: string;
  schedule: string;
  doseMcg: number;
  metrics: SteadyStateMetrics;
};

const isDoseUnit = (value: string): value is DoseUnit => value === "mcg" || value === "mg";
const isHalfLifeUnit = (value: string): value is HalfLifeUnit => value === "hours" || value === "days";
const isHalfLifeFrequency = (value: string): value is HalfLifeFrequency =>
  value === "daily" || value === "everyXDays" || value === "weekly";

const normalizePeptideName = (name: string) => name.trim().toLowerCase();

const findPreloadedPeptideName = (name: string) => {
  const normalized = normalizePeptideName(name);
  return PRELOADED_PEPTIDES.find((peptideName) => normalizePeptideName(peptideName) === normalized);
};

const convertHalfLifeToHours = (value: number, unitText: string) => {
  const unit = unitText.toLowerCase();
  if (unit.startsWith("min")) return value / 60;
  if (unit === "h" || unit.startsWith("hr") || unit.startsWith("hour")) return value;
  if (unit === "d" || unit.startsWith("day")) return value * 24;
  if (unit === "w" || unit.startsWith("week")) return value * 24 * 7;
  return value;
};

const getDisplayHalfLife = (value: number, unitText: string): HalfLifeEstimate => {
  const unit = unitText.toLowerCase();
  if (unit === "d" || unit.startsWith("day")) {
    return { value, unit: "days", hours: value * 24 };
  }
  if (unit === "w" || unit.startsWith("week")) {
    return { value: value * 7, unit: "days", hours: value * 24 * 7 };
  }
  return { value: convertHalfLifeToHours(value, unitText), unit: "hours", hours: convertHalfLifeToHours(value, unitText) };
};

const extractHalfLifeFromProfile = (peptideName: string): HalfLifeEstimate | null => {
  if (!hasJsonPeptideProfile(peptideName)) return null;
  const catalogHalfLifeHours = getPeptideHalfLifeHours(peptideName);
  if (catalogHalfLifeHours && catalogHalfLifeHours > 0) {
    if (catalogHalfLifeHours >= 24) {
      return { value: catalogHalfLifeHours / 24, unit: "days", hours: catalogHalfLifeHours };
    }
    return { value: catalogHalfLifeHours, unit: "hours", hours: catalogHalfLifeHours };
  }

  const profile = getPeptideProfile(peptideName);
  const profileText = [
    profile.whatIs,
    profile.keyBenefits,
    profile.mechanismOfAction,
    ...profile.quickStartGuide.map((item) => `${item.label}: ${item.value}`),
  ].join(" ");
  const patterns = [
    /half[-\s]?life(?:\s*(?:of|is|:|=))?\s*(?:~|approximately|approx\.?|about)?\s*(\d+(?:\.\d+)?)(?:\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?))?\s*(minutes?|mins?|hours?|hrs?|h|days?|d|weeks?|w)\b/i,
    /(?:~|approximately|approx\.?|about)?\s*(\d+(?:\.\d+)?)(?:\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?))?\s*-?\s*(minutes?|mins?|hours?|hrs?|h|days?|d|weeks?|w)\b[^.!?]{0,45}half[-\s]?life/i,
  ];

  for (const pattern of patterns) {
    const match = profileText.match(pattern);
    if (!match) continue;
    const firstValue = Number(match[1]);
    const secondValue = match[2] ? Number(match[2]) : firstValue;
    const unitText = match[3];
    if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) continue;
    return getDisplayHalfLife((firstValue + secondValue) / 2, unitText);
  }

  return null;
};

const formatHalfLifeValue = (value: number) => {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.?0+$/, "");
};

const formatChartAmount = (amountMcg: number) => {
  if (amountMcg >= 1000) return `${(amountMcg / 1000).toFixed(amountMcg >= 10000 ? 0 : 1)} mg`;
  if (amountMcg >= 100) return `${amountMcg.toFixed(0)} mcg`;
  if (amountMcg >= 10) return `${amountMcg.toFixed(1)} mcg`;
  return `${amountMcg.toFixed(2)} mcg`;
};

const formatDoseAmount = (amountMcg: number) => {
  if (amountMcg >= 1000) return `${Number((amountMcg / 1000).toFixed(3))} mg`;
  return `${Number(amountMcg.toFixed(2))} mcg`;
};

const buildRepeatedDoseHalfLifePoints = (
  doseMcg: number,
  halfLifeHours: number,
  daysToShow: number,
  frequencyDays: number
) => {
  if (doseMcg <= 0 || halfLifeHours <= 0 || daysToShow <= 0 || frequencyDays <= 0) return [];
  const points: HalfLifePoint[] = [];
  const stepsPerDay = 4;
  const doseOffsets: number[] = [];

  for (let doseDay = 0; doseDay <= daysToShow; doseDay += frequencyDays) {
    doseOffsets.push(doseDay);
    if (doseOffsets.length > 1000) break;
  }

  for (let step = 0; step <= daysToShow * stepsPerDay; step += 1) {
    const dayOffset = step / stepsPerDay;
    const amountMcg = doseOffsets.reduce((sum, doseDay) => {
      if (doseDay > dayOffset) return sum;
      const hoursSinceDose = (dayOffset - doseDay) * 24;
      return sum + doseMcg * Math.pow(0.5, hoursSinceDose / halfLifeHours);
    }, 0);
    points.push({
      dayOffset,
      amountMcg,
    });
  }

  return points;
};

const calculateSteadyStateMetrics = (
  doseMcg: number,
  halfLifeHours: number,
  frequencyDays: number
): SteadyStateMetrics | null => {
  return calculatePatternSteadyStateMetrics(doseMcg, halfLifeHours, [frequencyDays]);
};

const calculatePatternSteadyStateMetrics = (
  doseMcg: number,
  halfLifeHours: number,
  intervalPatternDays: number[]
): SteadyStateMetrics | null => {
  const validIntervals = intervalPatternDays.filter((interval) => interval > 0);
  if (doseMcg <= 0 || halfLifeHours <= 0 || validIntervals.length === 0) return null;

  const simulate = (injections: number) => {
    let postDoseAmount = 0;
    const cyclePreDoses: number[] = [];
    const cyclePostDoses: number[] = [];
    const cycleAverageSamples: number[] = [];
    const samplesPerDay = 8;

    for (let injectionIndex = 0; injectionIndex < injections; injectionIndex += 1) {
      if (injectionIndex > 0) {
        const interval = validIntervals[(injectionIndex - 1) % validIntervals.length];
        postDoseAmount *= Math.pow(0.5, (interval * 24) / halfLifeHours);
      }
      const preDoseAmount = postDoseAmount;
      postDoseAmount += doseMcg;

      if (injectionIndex >= injections - validIntervals.length) {
        cyclePreDoses.push(preDoseAmount);
        cyclePostDoses.push(postDoseAmount);

        const intervalAfterDose = validIntervals[injectionIndex % validIntervals.length];
        const sampleCount = Math.max(1, Math.round(intervalAfterDose * samplesPerDay));
        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
          const sampleDayOffset = (sampleIndex / sampleCount) * intervalAfterDose;
          cycleAverageSamples.push(
            postDoseAmount * Math.pow(0.5, (sampleDayOffset * 24) / halfLifeHours)
          );
        }
      }
    }

    return {
      high: Math.max(...cyclePostDoses, postDoseAmount),
      low: Math.min(...cyclePreDoses, postDoseAmount),
      average:
        cycleAverageSamples.length > 0
          ? cycleAverageSamples.reduce((sum, value) => sum + value, 0) / cycleAverageSamples.length
          : postDoseAmount,
    };
  };

  const steady = simulate(Math.max(500, validIntervals.length * 120));
  const steadyStateMcg = steady.high;
  const lowAtSteadyStateMcg = steady.low;
  const dailyAverageMcg = steady.average;
  const threshold = steadyStateMcg * 0.95;
  let injectionsToSteadyState = 1;
  let postDoseAmount = 0;

  for (let injectionIndex = 0; injectionIndex < 1000; injectionIndex += 1) {
    if (injectionIndex > 0) {
      const interval = validIntervals[(injectionIndex - 1) % validIntervals.length];
      postDoseAmount *= Math.pow(0.5, (interval * 24) / halfLifeHours);
    }
    postDoseAmount += doseMcg;
    if (postDoseAmount >= threshold) {
      injectionsToSteadyState = injectionIndex + 1;
      break;
    }
  }

  const averageIntervalDays =
    validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
  const daysToShow = Math.max(1, Math.ceil((injectionsToSteadyState + 2) * averageIntervalDays));

  return {
    steadyStateMcg,
    lowAtSteadyStateMcg,
    dailyAverageMcg,
    injectionsToSteadyState,
    daysToShow,
  };
};

const buildHalfLifeComparisonRows = (
  enteredDoseMcg: number,
  enteredFrequencyDays: number,
  halfLifeHours: number
): ComparisonRow[] => {
  if (enteredDoseMcg <= 0 || enteredFrequencyDays <= 0 || halfLifeHours <= 0) return [];

  const weeklyDoseMcg = enteredDoseMcg * (7 / enteredFrequencyDays);
  const comparisonConfigs = [
    {
      label: "Daily",
      schedule: "Every day",
      doseMcg: weeklyDoseMcg / 7,
      intervals: [1],
    },
    {
      label: "Twice Weekly",
      schedule: "Split 3 / 4 days",
      doseMcg: weeklyDoseMcg / 2,
      intervals: [3, 4],
    },
    {
      label: "Weekly",
      schedule: "Every 7 days",
      doseMcg: weeklyDoseMcg,
      intervals: [7],
    },
  ];

  return comparisonConfigs.flatMap((config) => {
    const metrics = calculatePatternSteadyStateMetrics(config.doseMcg, halfLifeHours, config.intervals);
    if (!metrics) return [];
    return [{ label: config.label, schedule: config.schedule, doseMcg: config.doseMcg, metrics }];
  });
};

const HalfLifeComparisonTable: React.FC<{ rows: ComparisonRow[] }> = ({ rows }) => (
  <div style={{ marginTop: "14px" }}>
    <h4 style={{ fontSize: "0.95rem", marginBottom: "8px" }}>Frequency Comparison</h4>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
            <th style={{ padding: "7px 5px" }}>Schedule</th>
            <th style={{ padding: "7px 5px" }}>Dose Each</th>
            <th style={{ padding: "7px 5px" }}>Steady State</th>
            <th style={{ padding: "7px 5px" }}>Low at SS</th>
            <th style={{ padding: "7px 5px" }}>Daily Avg</th>
            <th style={{ padding: "7px 5px" }}>Inj. to SS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: "8px 5px" }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.label}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "2px" }}>{row.schedule}</div>
              </td>
              <td style={{ padding: "8px 5px", whiteSpace: "nowrap" }}>{formatDoseAmount(row.doseMcg)}</td>
              <td style={{ padding: "8px 5px", whiteSpace: "nowrap" }}>{formatChartAmount(row.metrics.steadyStateMcg)}</td>
              <td style={{ padding: "8px 5px", whiteSpace: "nowrap" }}>{formatChartAmount(row.metrics.lowAtSteadyStateMcg)}</td>
              <td style={{ padding: "8px 5px", whiteSpace: "nowrap" }}>{formatChartAmount(row.metrics.dailyAverageMcg)}</td>
              <td style={{ padding: "8px 5px", whiteSpace: "nowrap" }}>{row.metrics.injectionsToSteadyState}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", lineHeight: 1.45, marginTop: "8px" }}>
      Comparison uses the same total weekly dose. Twice weekly splits that weekly total in half with alternating 3-day and 4-day gaps.
    </p>
  </div>
);

const HalfLifeChart: React.FC<{
  points: HalfLifePoint[];
  daysToShow: number;
  metrics: SteadyStateMetrics;
}> = ({ points, daysToShow, metrics }) => {
  const width = 720;
  const height = 250;
  const padding = { top: 18, right: 16, bottom: 34, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxAmount = Math.max(...points.map((point) => point.amountMcg), 1);
  const path = points
    .map((point, index) => {
      const x = padding.left + (point.dayOffset / daysToShow) * chartWidth;
      const y = padding.top + chartHeight - (point.amountMcg / maxAmount) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px", marginBottom: "12px" }}>
        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "10px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "4px" }}>Steady State</div>
          <div style={{ fontWeight: 700 }}>{formatChartAmount(metrics.steadyStateMcg)}</div>
        </div>
        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "10px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "4px" }}>Low at SS</div>
          <div style={{ fontWeight: 700 }}>{formatChartAmount(metrics.lowAtSteadyStateMcg)}</div>
        </div>
        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "10px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "4px" }}>Daily Avg</div>
          <div style={{ fontWeight: 700 }}>{formatChartAmount(metrics.dailyAverageMcg)}</div>
        </div>
        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "10px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "4px" }}>Injections to SS</div>
          <div style={{ fontWeight: 700 }}>{metrics.injectionsToSteadyState}</div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Estimated half-life decay chart" style={{ width: "100%", minWidth: "520px" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">
                  {formatChartAmount(maxAmount * ratio)}
                </text>
              </g>
            );
          })}
          {[0, Math.ceil(daysToShow / 2), daysToShow].map((day) => {
            const x = padding.left + (day / daysToShow) * chartWidth;
            return (
              <g key={day}>
                <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} stroke="rgba(255,255,255,0.06)" />
                <text x={x} y={height - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="11">
                  +{day}d
                </text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path
            d={`${path} L ${padding.left + chartWidth} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`}
            fill="rgba(99, 102, 241, 0.12)"
          />
        </svg>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.45, marginTop: "8px" }}>
        Estimated from entered dose, frequency, and half-life. This is an educational model, not a clinical effect prediction.
      </p>
    </div>
  );
};

type GuidesPageProps = {
  mode?: "guides" | "halfLife";
};

export const GuidesPage: React.FC<GuidesPageProps> = ({ mode = "guides" }) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [copiedYoutube, setCopiedYoutube] = useState(false);
  const [copiedSkool, setCopiedSkool] = useState(false);
  const [halfLifePeptideName, setHalfLifePeptideName] = useState("");
  const [halfLifeInput, setHalfLifeInput] = useState("");
  const [halfLifeUnit, setHalfLifeUnit] = useState<HalfLifeUnit>("hours");
  const [doseInput, setDoseInput] = useState("");
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("mcg");
  const [frequency, setFrequency] = useState<HalfLifeFrequency>("daily");
  const [frequencyDaysInput, setFrequencyDaysInput] = useState("2");
  const [halfLifeSourceMessage, setHalfLifeSourceMessage] = useState("");

  const handleCopyYoutube = () => {
    navigator.clipboard.writeText("https://www.youtube.com/@RetaUnfiltered");
    setCopiedYoutube(true);
    setTimeout(() => setCopiedYoutube(false), 2000);
  };

  const handleCopySkool = () => {
    navigator.clipboard.writeText("https://www.skool.com/retaunfiltered");
    setCopiedSkool(true);
    setTimeout(() => setCopiedSkool(false), 2000);
  };

  const handleHalfLifePeptideChange = (value: string) => {
    setHalfLifePeptideName(value);
    const matchedName = findPreloadedPeptideName(value);
    if (!matchedName) {
      setHalfLifeSourceMessage("");
      return;
    }

    const estimate = extractHalfLifeFromProfile(matchedName);
    if (!estimate) {
      setHalfLifeSourceMessage("No half-life found in the peptide profile. You can enter one manually.");
      return;
    }

    setHalfLifeInput(formatHalfLifeValue(estimate.value));
    setHalfLifeUnit(estimate.unit);
    setHalfLifeSourceMessage(`Auto-filled from ${matchedName} profile data. You can edit it if needed.`);
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const parsedHalfLife = parseFloat(halfLifeInput);
  const halfLifeHours = halfLifeUnit === "days" ? parsedHalfLife * 24 : parsedHalfLife;
  const parsedDose = parseFloat(doseInput);
  const doseMcg = Number.isFinite(parsedDose) && parsedDose > 0 ? normalizeDoseToMcg(parsedDose, doseUnit) : 0;
  const parsedFrequencyDays = parseFloat(frequencyDaysInput);
  const frequencyDays =
    frequency === "daily"
      ? 1
      : frequency === "weekly"
      ? 7
      : Number.isFinite(parsedFrequencyDays) && parsedFrequencyDays > 0
      ? parsedFrequencyDays
      : 0;
  const steadyStateMetrics =
    Number.isFinite(halfLifeHours) && halfLifeHours > 0 && doseMcg > 0 && frequencyDays > 0
      ? calculateSteadyStateMetrics(doseMcg, halfLifeHours, frequencyDays)
      : null;
  const chartDayCount = steadyStateMetrics?.daysToShow || 0;
  const halfLifeChartPoints =
    steadyStateMetrics
      ? buildRepeatedDoseHalfLifePoints(doseMcg, halfLifeHours, chartDayCount, frequencyDays)
      : [];
  const comparisonRows =
    Number.isFinite(halfLifeHours) && halfLifeHours > 0 && doseMcg > 0 && frequencyDays > 0
      ? buildHalfLifeComparisonRows(doseMcg, frequencyDays, halfLifeHours)
      : [];

  const halfLifeCalculatorCard = (
    <Card style={{ marginBottom: "16px" }}>
      <h3 style={{ fontSize: "1.05rem", marginBottom: "6px" }}>Half-Life Calculator</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.45, marginBottom: "14px" }}>
        Choose a peptide, confirm or edit the half-life, enter a dose, and the chart will estimate single-dose decay over time.
      </p>

      <datalist id="half-life-peptide-options">
        {PRELOADED_PEPTIDES.map((peptideName) => (
          <option key={peptideName} value={peptideName} />
        ))}
      </datalist>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Input
          label="Peptide Name"
          list="half-life-peptide-options"
          value={halfLifePeptideName}
          onChange={(e) => handleHalfLifePeptideChange(e.target.value)}
          placeholder="Start typing or choose a peptide"
        />

        {halfLifeSourceMessage && (
          <div
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius-sm)",
              padding: "10px 12px",
              color: "var(--text-secondary)",
              background: "rgba(255,255,255,0.02)",
              fontSize: "0.8rem",
              lineHeight: 1.4,
            }}
          >
            {halfLifeSourceMessage}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(110px, 0.5fr)",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <Input
            label="Half-Life"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            value={halfLifeInput}
            onChange={(e) => {
              setHalfLifeInput(e.target.value);
              if (halfLifeSourceMessage) setHalfLifeSourceMessage("Half-life edited manually.");
            }}
            placeholder={halfLifeUnit === "days" ? "e.g. 7" : "e.g. 24"}
          />
          <Select
            label="Unit"
            value={halfLifeUnit}
            onChange={(e) => {
              if (isHalfLifeUnit(e.target.value)) setHalfLifeUnit(e.target.value);
            }}
            options={[
              { value: "hours", label: "Hours" },
              { value: "days", label: "Days" },
            ]}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(100px, 0.45fr)",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <Input
            label="Dose Taken"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            placeholder="e.g. 500"
          />
          <Select
            label="Unit"
            value={doseUnit}
            onChange={(e) => {
              if (isDoseUnit(e.target.value)) setDoseUnit(e.target.value);
            }}
            options={[
              { value: "mcg", label: "mcg" },
              { value: "mg", label: "mg" },
            ]}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              frequency === "everyXDays"
                ? "minmax(0, 1fr) minmax(120px, 0.55fr)"
                : "minmax(0, 1fr)",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <Select
            label="How Often"
            value={frequency}
            onChange={(e) => {
              if (isHalfLifeFrequency(e.target.value)) setFrequency(e.target.value);
            }}
            options={[
              { value: "daily", label: "Daily" },
              { value: "everyXDays", label: "Every X Days" },
              { value: "weekly", label: "Weekly" },
            ]}
          />
          {frequency === "everyXDays" && (
            <Input
              label="Every"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="any"
              suffix="days"
              value={frequencyDaysInput}
              onChange={(e) => setFrequencyDaysInput(e.target.value)}
              placeholder="e.g. 3"
            />
          )}
        </div>

        {halfLifeChartPoints.length > 0 && steadyStateMetrics ? (
          <>
            <HalfLifeChart
              points={halfLifeChartPoints}
              daysToShow={chartDayCount}
              metrics={steadyStateMetrics}
            />
            {comparisonRows.length > 0 && <HalfLifeComparisonTable rows={comparisonRows} />}
          </>
        ) : (
          <div
            style={{
              border: "1px dashed var(--border-color)",
              borderRadius: "var(--border-radius-sm)",
              padding: "14px",
              color: "var(--text-secondary)",
              fontSize: "0.86rem",
              lineHeight: 1.45,
            }}
          >
            Enter a half-life, dose, and valid frequency to generate the chart.
          </div>
        )}
      </div>
    </Card>
  );

  if (mode === "halfLife") {
    return <div className="fade-in">{halfLifeCalculatorCard}</div>;
  }

  const sections = [
    {
      id: "reconstitution",
      title: "Reconstitution & Mixing Guide",
      icon: <Droplet size={20} className="text-primary" style={{ color: "var(--color-primary)" }} />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "var(--text-primary)" }}>
          <p>
            Lyophilized peptides arrive as a freeze-dried powder. Reconstitution is the process of mixing this powder with sterile Bacteriostatic (BAC) water so it can be measured and administered.
          </p>

          <div
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px",
              marginTop: "4px"
            }}
          >
            <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px" }}>
              The Reconstitution Formula
            </h4>
            <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-primary)", padding: "4px 0" }}>
              Dose Draw (mL) = (Desired Dose (mcg) / Total Vial Peptide (mcg)) × BAC Water Volume (mL)
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Note: 1 mg = 1,000 mcg. Therefore, a 5 mg vial contains 5,000 mcg.
            </p>
          </div>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "8px" }}>Common Mixing Configurations</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "6px 4px" }}>Vial Size</th>
                  <th style={{ padding: "6px 4px" }}>BAC Water</th>
                  <th style={{ padding: "6px 4px" }}>Target Dose</th>
                  <th style={{ padding: "6px 4px" }}>Syringe Draw</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: "8px 4px" }}>5 mg</td>
                  <td style={{ padding: "8px 4px" }}>2.0 mL</td>
                  <td style={{ padding: "8px 4px" }}>250 mcg</td>
                  <td style={{ padding: "8px 4px", fontWeight: "bold", color: "var(--color-primary)" }}>10 Units (0.1 mL)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: "8px 4px" }}>10 mg</td>
                  <td style={{ padding: "8px 4px" }}>2.0 mL</td>
                  <td style={{ padding: "8px 4px" }}>500 mcg</td>
                  <td style={{ padding: "8px 4px", fontWeight: "bold", color: "var(--color-primary)" }}>10 Units (0.1 mL)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: "8px 4px" }}>15 mg</td>
                  <td style={{ padding: "8px 4px" }}>3.0 mL</td>
                  <td style={{ padding: "8px 4px" }}>750 mcg</td>
                  <td style={{ padding: "8px 4px", fontWeight: "bold", color: "var(--color-primary)" }}>15 Units (0.15 mL)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "8px" }}>Step-by-Step Mixing Protocol:</h4>
          <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>Clean your workspace and wash your hands thoroughly.</li>
            <li>Wipe the rubber stoppers of both the BAC water vial and the peptide vial with an alcohol swab; let them dry for 10 seconds.</li>
            <li>Using a syringe, draw the exact volume of BAC water required.</li>
            <li>Insert the needle into the peptide vial at a 45-degree angle. <strong>Slowly</strong> drip the water down the inside glass wall of the vial. Do not spray directly onto the powder.</li>
            <li>Once the water is added, withdraw the needle. Gently swirl the vial in circular motions. <strong>Never shake the vial</strong> as peptides are extremely fragile proteins.</li>
          </ol>
        </div>
      )
    },
    {
      id: "syringe",
      title: "Syringes Decoded (U-100 vs U-40)",
      icon: <Activity size={20} style={{ color: "var(--color-secondary)" }} />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "var(--text-primary)" }}>
          <p>
            Understanding the distinction between liquid volume (mL) and syringe markers (Units) is crucial to avoid under-dosing or over-dosing.
          </p>

          <div
            style={{
              background: "var(--bg-active-soft)",
              border: "1px solid var(--border-color-focus)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px"
            }}
          >
            <h4 style={{ fontSize: "0.9rem", color: "var(--color-primary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Info size={16} /> U-100 Syringes (Standard)
            </h4>
            <p style={{ fontSize: "0.85rem" }}>
              Most insulin/peptide syringes are **U-100**, which means there are **100 units in 1.0 mL** of volume.
            </p>
            <div style={{ fontFamily: "monospace", fontSize: "0.85rem", marginTop: "6px", color: "var(--text-secondary)" }}>
              • 1 Unit = 0.01 mL<br />
              • 10 Units = 0.10 mL<br />
              • 50 Units = 0.50 mL
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border-color-focus)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px"
            }}
          >
            <h4 style={{ fontSize: "0.9rem", color: "var(--color-secondary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Info size={16} /> U-40 Syringes
            </h4>
            <p style={{ fontSize: "0.85rem" }}>
              Some specialized veterinary or therapeutic syringes are **U-40**, which means **40 units in 1.0 mL**.
            </p>
            <div style={{ fontFamily: "monospace", fontSize: "0.85rem", marginTop: "6px", color: "var(--text-secondary)" }}>
              • 1 Unit = 0.025 mL<br />
              • 10 Units = 0.25 mL<br />
              • 20 Units = 0.50 mL
            </div>
          </div>

          <div
            style={{
              background: "rgba(244, 63, 94, 0.05)",
              border: "1px solid rgba(244, 63, 94, 0.2)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px",
              display: "flex",
              gap: "8px"
            }}
          >
            <ShieldAlert size={20} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
            <div style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
              <strong>Important Warning:</strong> Always look at your syringe barrel to verify its scale type (usually written as U-100 or U-40) and size (e.g., 0.3mL, 0.5mL, or 1.0mL) before calculating your dose draw!
            </div>
          </div>
        </div>
      )
    },
    {
      id: "injection",
      title: "Subcutaneous Injection Basics",
      icon: <FileText size={20} style={{ color: "var(--color-success)" }} />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "var(--text-primary)" }}>
          <p>
            Subcutaneous (SubQ) injections are administered into the fatty tissue layer just beneath the skin. This allows for slow, stable absorption of the peptide.
          </p>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Common Injection Sites:</h4>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <li><strong>Abdomen:</strong> At least 2 inches away from the belly button (ideal for consistency).</li>
            <li><strong>Thighs:</strong> Outer, middle aspect of the thigh.</li>
            <li><strong>Love Handles:</strong> Side of the waist.</li>
          </ul>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "8px" }}>Administration Guide:</h4>
          <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>Wash hands and sterilize the injection site with an alcohol pad. Allow the skin to dry completely to prevent stinging.</li>
            <li>Pinch a 1-to-2 inch fold of skin between your thumb and forefinger to isolate the subcutaneous tissue from muscle.</li>
            <li>Insert the needle quickly at a 45-to-90-degree angle, depending on the needle length and tissue thickness.</li>
            <li>Depress the plunger slowly and steadily until all liquid is injected.</li>
            <li>Hold the needle in place for 3 to 5 seconds, then pull the needle straight out at the same angle it was inserted.</li>
            <li>Dispose of the syringe immediately in an approved Sharps Container. <strong>Never reuse needles.</strong></li>
          </ol>
        </div>
      )
    },
    {
      id: "storage",
      title: "Storage & Handling Best Practices",
      icon: <ShieldAlert size={20} style={{ color: "var(--color-warning)" }} />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "var(--text-primary)" }}>
          <p>
            Peptides are delicate chains of amino acids. Exposure to heat, light, and mechanical stress can degrade their efficacy.
          </p>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Lyophilized Powder (Unmixed):</h4>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <li>Store in a cool, dry, dark place.</li>
            <li><strong>Short term (months):</strong> Standard refrigeration (2°C to 8°C / 36°F to 46°F) is sufficient.</li>
            <li><strong>Long term (years):</strong> Store in a freezer (-20°C / -4°F) to prevent degradation.</li>
          </ul>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "8px" }}>Reconstituted Peptide (Mixed):</h4>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <li><strong>Must be refrigerated:</strong> Always keep in the refrigerator after mixing.</li>
            <li>Do not freeze reconstituted peptides, as freezing liquid will damage the peptide bonds.</li>
            <li>Keep out of direct sunlight and extreme temperatures.</li>
            <li>Use within 3 to 8 weeks (depending on the specific peptide stability profile).</li>
          </ul>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "8px" }}>Avoid Physical Shock:</h4>
          <p>
            Avoid dropping or shaking the reconstituted vial. When pulling doses, insert the needle gently, and avoid venting/bubbling the liquid unnecessarily.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: "30px" }}>
      {/* Top Header Section: Reta Unfiltered */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", marginBottom: "4px" }}>
          Reta Unfiltered
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
          Join the community and find educational walkthroughs, peptide discussions, and resources.
        </p>

        {/* Links Card */}
        <Card
          style={{
            background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            border: "1px solid var(--border-color)",
          }}
        >
          {/* YouTube Link Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#ef4444" style={{ flexShrink: 0 }}>
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.503a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11C4.482 20.5 12 20.5 12 20.5s7.518 0 9.388-.503a3.003 3.003 0 0 0 2.11-2.11c.502-1.87.502-5.837.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>YouTube Channel</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>@RetaUnfiltered</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href="https://www.youtube.com/@RetaUnfiltered"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={12} />
                Visit YouTube
              </a>
              <Button
                variant="ghost"
                onClick={handleCopyYoutube}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.8rem",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-button-ghost-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minWidth: "100px",
                }}
              >
                {copiedYoutube ? (
                  <>
                    <Check size={12} style={{ color: "var(--color-success)" }} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)" }}></div>

          {/* Skool Link Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                </svg>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>Skool Community</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>/retaunfiltered</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href="https://www.skool.com/retaunfiltered"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={12} />
                Visit Skool
              </a>
              <Button
                variant="ghost"
                onClick={handleCopySkool}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.8rem",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-button-ghost-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minWidth: "100px",
                }}
              >
                {copiedSkool ? (
                  <>
                    <Check size={12} style={{ color: "var(--color-success)" }} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Safety Callout Card */}
      <Card
        style={{
          border: "1px dashed rgba(245, 158, 11, 0.3)",
          background: "rgba(245, 158, 11, 0.03)",
          padding: "12px 14px",
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          marginTop: "16px"
        }}
      >
        <ShieldAlert size={22} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--color-warning)" }}>Disclaimer:</strong> The contents of this page are for educational and informational purposes only. This application does not offer medical advice. Always consult with a healthcare professional regarding any clinical concerns.
        </div>
      </Card>

      {/* Accordion List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        {sections.map((sect) => {
          const isOpen = openSection === sect.id;
          return (
            <Card
              key={sect.id}
              style={{
                padding: "0",
                overflow: "hidden",
                border: isOpen ? "1px solid var(--border-color-focus)" : "1px solid var(--border-color)",
                background: "var(--bg-card)"
              }}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleSection(sect.id)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "between",
                  cursor: "pointer",
                  textAlign: "left",
                  outline: "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                  {sect.icon}
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {sect.title}
                  </span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </button>

              {/* Accordion Body */}
              {isOpen && (
                <div
                  style={{
                    padding: "0 16px 16px 16px",
                    borderTop: "1px solid var(--border-color)",
                    animation: "fadeIn 0.2s ease-out"
                  }}
                >
                  {sect.content}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
