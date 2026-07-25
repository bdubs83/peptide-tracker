import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Apple, ChevronLeft, ChevronRight, Footprints, Gauge, HeartPulse, Moon, Mountain, Scale, Watch } from "lucide-react";
import { Card } from "../../components/Card";
import { activeRecords } from "../../db/activeRecords";
import { db } from "../../db/db";
import type { HealthLog } from "../../types/healthLog";
import type { WeightLog } from "../../types/weightLog";
import { ProfilePage } from "../vault/ProfilePage";
import { getHealthSection } from "./healthSections";
import { healthTrackerEnabledKey } from "./healthImport";
import {
  calculateAge,
  calculateBmi,
  calculateRmr,
  estimateStepCalories,
  healthProfileBirthDateKey,
  healthProfileHeightCmKey,
  healthProfileSexKey,
  type MetabolicSex,
} from "./healthCalculations";

const number = (value: number, digits = 0) => new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: Date, days: number) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
const startOfWeek = (date: Date) => { const result = new Date(date); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result; };

const latestHealthLog = (logs: HealthLog[], metric: HealthLog["metric"]) =>
  logs.filter((entry) => entry.metric === metric).sort((left, right) => right.startTime.localeCompare(left.startTime))[0];

const sleepLogsForDisplay = (logs: HealthLog[]) => {
  const sleepLogs = logs.filter((entry) => entry.metric === "sleep");
  const aggregateSleepLogs = sleepLogs.filter((entry) => entry.sourceRecordId?.startsWith("aggregate-noon:"));
  if (aggregateSleepLogs.length > 0) return aggregateSleepLogs;

  const legacyDailySleepLogs = sleepLogs.filter((entry) => entry.sourceRecordId?.startsWith("daily:"));
  return legacyDailySleepLogs.length > 0 ? legacyDailySleepLogs : sleepLogs;
};

const healthValue = (entry?: HealthLog, digits = 0) => entry?.value === undefined ? "—" : `${number(entry.value, digits)} ${entry.unit}`;

const MetricBlock: React.FC<{ label: string; value: string; detail: string; icon: React.ReactNode }> = ({ label, value, detail, icon }) => (
  <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-md)", padding: "14px", background: "var(--bg-input)", minHeight: "112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}><span>{label}</span>{icon}</div>
    <div><div style={{ color: "var(--text-primary)", fontSize: "1.25rem", fontWeight: 900 }}>{value}</div><div style={{ color: "var(--text-muted)", fontSize: "0.73rem", marginTop: "3px" }}>{detail}</div></div>
  </div>
);

const HealthOverview: React.FC<{ healthLogs: HealthLog[]; weightLogs: WeightLog[]; weightUnit: string; birthDate: string; metabolicSex: MetabolicSex; profileHeightCm: number | null }> = ({ healthLogs, weightLogs, weightUnit, birthDate, metabolicSex, profileHeightCm }) => {
  const [referenceTime] = useState(() => Date.now());
  const latestWeight = [...weightLogs].sort((left, right) => `${right.date}T${right.time}`.localeCompare(`${left.date}T${left.time}`))[0];
  const importedHeight = latestHealthLog(healthLogs, "height")?.value;
  const heightCm = profileHeightCm || importedHeight || null;
  const weightKg = latestWeight ? Number(latestWeight.weight) / (weightUnit === "kg" ? 1 : 2.2046226218) : null;
  const age = calculateAge(birthDate, new Date(referenceTime));
  const bmi = weightKg && heightCm ? calculateBmi(weightKg, heightCm) : null;
  const estimatedRmr = weightKg && heightCm && age !== null ? calculateRmr(weightKg, heightCm, age, metabolicSex) : null;
  const bodyFat = latestWeight?.bodyFat || latestHealthLog(healthLogs, "bodyFat")?.value;
  const steps = latestHealthLog(healthLogs, "steps");
  const activeCalories = latestHealthLog(healthLogs, "activeCalories");
  const totalCalories = latestHealthLog(healthLogs, "totalCalories");
  const deviceBasalCalories = latestHealthLog(healthLogs, "basalCalories");
  const distance = latestHealthLog(healthLogs, "distance");
  const latestSleep = sleepLogsForDisplay(healthLogs).sort((left, right) => right.startTime.localeCompare(left.startTime))[0];
  const stepCalories = steps?.value && weightKg ? estimateStepCalories(steps.value, weightKg, distance?.value) : null;
  const workouts = healthLogs.filter((entry) => entry.metric === "exercise" && new Date(entry.startTime).getTime() >= referenceTime - 7 * 86400000).length;

  return <>
    <Card style={{ marginBottom: "16px" }}>
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 5px" }}>Key metrics</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.45, margin: "0 0 13px" }}>A quick view of your latest Body Tracker and connected activity data.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
        <MetricBlock label="Weight" value={latestWeight ? `${number(Number(latestWeight.weight), 1)} ${weightUnit}` : "—"} detail={latestWeight ? new Date(`${latestWeight.date}T12:00:00`).toLocaleDateString() : "No Body Tracker entry"} icon={<Scale size={18} />} />
        <MetricBlock label="Body fat" value={bodyFat !== undefined ? `${number(Number(bodyFat), 1)}%` : "—"} detail="Latest available reading" icon={<HeartPulse size={18} />} />
        <MetricBlock label="BMI" value={bmi ? number(bmi, 1) : "—"} detail={heightCm ? "Weight ÷ height²" : "Add height in Settings"} icon={<Gauge size={18} />} />
        <MetricBlock label="Estimated RMR" value={estimatedRmr ? `${number(estimatedRmr)} kcal` : "—"} detail="Mifflin–St Jeor estimate" icon={<Activity size={18} />} />
        <MetricBlock label="Steps" value={steps?.value !== undefined ? number(steps.value) : "—"} detail={steps ? new Date(steps.startTime).toLocaleDateString() : "Connect Activity in Settings"} icon={<Footprints size={18} />} />
        <MetricBlock label="Active calories" value={activeCalories?.value !== undefined ? `${number(activeCalories.value)} kcal` : "—"} detail="Latest daily total" icon={<Activity size={18} />} />
        <MetricBlock label="Total energy" value={totalCalories?.value !== undefined ? `${number(totalCalories.value)} kcal` : "—"} detail="Device total: active + basal" icon={<Activity size={18} />} />
        <MetricBlock label="Basal energy" value={deviceBasalCalories?.value !== undefined ? `${number(deviceBasalCalories.value)} kcal` : "—"} detail="Recorded by Health Connect" icon={<HeartPulse size={18} />} />
        <MetricBlock label="Step calories" value={stepCalories ? `~${number(stepCalories)} kcal` : "—"} detail={distance?.value ? "Estimate using distance and weight" : "Rough estimate using steps and weight"} icon={<Footprints size={18} />} />
        <MetricBlock label="Distance" value={distance?.value !== undefined ? `${number(distance.value, 2)} km` : "—"} detail="Latest daily total" icon={<Mountain size={18} />} />
        <MetricBlock label="Workouts" value={String(workouts)} detail="Recorded in the last 7 days" icon={<Watch size={18} />} />
        <MetricBlock label="Latest sleep" value={latestSleep?.value !== undefined ? `${number(latestSleep.value / 60, 1)} hr` : "—"} detail={latestSleep ? new Date(latestSleep.startTime).toLocaleDateString() : "Connect Recovery in Settings"} icon={<Moon size={18} />} />
      </div>
    </Card>
  </>;
};

const ActivitySection: React.FC<{ logs: HealthLog[] }> = ({ logs }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const stepLogs = logs.filter((entry) => entry.metric === "steps");
  const dailySteps = days.map((day) => stepLogs.filter((entry) => entry.startTime.slice(0, 10) === dateKey(day)).reduce((sum, entry) => sum + (entry.value || 0), 0));
  const maximum = Math.max(...dailySteps, 1);
  const total = dailySteps.reduce((sum, value) => sum + value, 0);
  const average = Math.round(total / 7);
  const workouts = logs.filter((entry) => entry.metric === "exercise" && entry.startTime.slice(0, 10) >= dateKey(days[0]) && entry.startTime.slice(0, 10) <= dateKey(days[6])).sort((left, right) => right.startTime.localeCompare(left.startTime));
  const fitnessMetrics: Array<{ metric: HealthLog["metric"]; label: string; digits?: number }> = [
    { metric: "activeCalories", label: "Active calories" },
    { metric: "totalCalories", label: "Total calories" },
    { metric: "basalCalories", label: "Basal calories" },
    { metric: "distance", label: "Distance", digits: 2 },
    { metric: "elevation", label: "Elevation", digits: 1 },
    { metric: "floors", label: "Floors", digits: 1 },
    { metric: "heartRateAverage", label: "Avg heart rate" },
    { metric: "heartRateMinimum", label: "Min heart rate" },
    { metric: "heartRateMaximum", label: "Max heart rate" },
    { metric: "speedAverage", label: "Avg speed", digits: 1 },
    { metric: "stepsCadence", label: "Step cadence", digits: 1 },
    { metric: "powerAverage", label: "Avg power", digits: 1 },
    { metric: "vo2Max", label: "VO₂ max", digits: 1 },
  ];

  return <>
    <Card style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}><Footprints size={21} style={{ color: "var(--color-primary)" }} /><h2 style={{ fontSize: "1.08rem", margin: 0 }}>Steps</h2></div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0 }}>Weekly totals from connected Health Connect devices.</p>
    </Card>

    <Card style={{ marginBottom: "16px" }}>
      <h2 style={{ fontSize: "1rem", margin: "0 0 10px" }}>Latest fitness metrics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
        {fitnessMetrics.map(({ metric, label, digits }) => <div key={metric} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "10px", background: "var(--bg-input)" }}><div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ fontWeight: 850, marginTop: "4px" }}>{healthValue(latestHealthLog(logs, metric), digits)}</div></div>)}
      </div>
    </Card>

    <Card style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
        <button type="button" className="btn btn-secondary" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Previous week"><ChevronLeft size={18} /></button>
        <div style={{ textAlign: "center" }}><div style={{ fontWeight: 850 }}>{weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div><div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "2px" }}>{number(total)} total · {number(average)} daily average</div></div>
        <button type="button" className="btn btn-secondary" onClick={() => setWeekOffset((value) => Math.min(0, value + 1))} disabled={weekOffset >= 0} aria-label="Next week"><ChevronRight size={18} /></button>
      </div>
      <div style={{ height: "190px", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "7px", alignItems: "end" }}>
        {days.map((day, index) => <div key={dateKey(day)} style={{ minWidth: 0, height: "100%", display: "grid", gridTemplateRows: "20px 1fr 18px", gap: "4px", alignItems: "end", textAlign: "center" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden" }}>{dailySteps[index] ? number(dailySteps[index]) : ""}</span>
          <div style={{ height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", background: "var(--bg-input)", borderRadius: "7px", overflow: "hidden" }}><div title={`${number(dailySteps[index])} steps`} style={{ width: "100%", height: `${dailySteps[index] ? Math.max(5, (dailySteps[index] / maximum) * 100) : 0}%`, background: "var(--gradient-brand)", borderRadius: "7px 7px 3px 3px", transition: "height 180ms ease" }} /></div>
          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: dateKey(day) === dateKey(new Date()) ? "var(--color-primary)" : "var(--text-secondary)" }}>{day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</span>
        </div>)}
      </div>
      {total === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "center", margin: "12px 0 0" }}>No step totals imported for this week.</p>}
    </Card>

    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}><Activity size={19} style={{ color: "var(--color-primary)" }} /><h2 style={{ fontSize: "1rem", margin: 0 }}>Workouts</h2></div>
      {workouts.length === 0 ? <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0 }}>No workouts imported for this week.</p> : <div style={{ display: "grid", gap: "8px" }}>{workouts.map((workout) => <div key={workout.id} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", display: "flex", justifyContent: "space-between", gap: "12px" }}><div><strong>{workout.label || "Workout"}</strong><div style={{ color: "var(--text-muted)", fontSize: "0.74rem", marginTop: "2px" }}>{new Date(workout.startTime).toLocaleString()}</div></div>{workout.value !== undefined && <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{workout.unit === "minutes" ? `${number(workout.value / 60, 1)} hr` : number(workout.value, 1)}</span>}</div>)}</div>}
    </Card>
  </>;
};

const nutritionLabel = (key: string) => key
  .replace(/_(kcal|mcg|mg|g)$/, "")
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const nutritionUnit = (key: string) => key.endsWith("_kcal") ? "kcal" : key.endsWith("_mcg") ? "mcg" : key.endsWith("_mg") ? "mg" : "g";

const NutritionSection: React.FC<{ logs: HealthLog[] }> = ({ logs }) => {
  const nutritionLogs = logs.filter((entry) => entry.metric === "nutrition").sort((left, right) => right.startTime.localeCompare(left.startTime));
  const latest = nutritionLogs[0];
  const hydration = latestHealthLog(logs, "hydration");
  const details = latest?.details || {};
  const macroKeys = ["calories_kcal", "protein_g", "carbohydrates_g", "fat_g"];
  const remaining = Object.entries(details).filter(([key]) => !macroKeys.includes(key));

  return <>
    <Card style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}><Apple size={21} style={{ color: "var(--color-primary)" }} /><h2 style={{ fontSize: "1.08rem", margin: 0 }}>Nutrition</h2></div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0 }}>Daily food, macro, micronutrient, and hydration totals supplied by connected nutrition apps.</p>
    </Card>
    {!latest ? <Card><p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", margin: 0 }}>No nutrition totals have been imported. Connect Nutrition from Settings after a compatible app has written food data to Health Connect.</p></Card> : <>
      <Card style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}><h2 style={{ fontSize: "1rem", margin: 0 }}>Latest daily totals</h2><span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{new Date(latest.startTime).toLocaleDateString()}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "9px" }}>
          {macroKeys.map((key) => <div key={key} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-md)", padding: "13px", background: "var(--bg-input)" }}><div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase" }}>{nutritionLabel(key)}</div><div style={{ fontSize: "1.15rem", fontWeight: 900, marginTop: "4px" }}>{typeof details[key] === "number" ? `${number(details[key] as number, 1)} ${nutritionUnit(key)}` : "—"}</div></div>)}
          <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-md)", padding: "13px", background: "var(--bg-input)" }}><div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase" }}>Hydration</div><div style={{ fontSize: "1.15rem", fontWeight: 900, marginTop: "4px" }}>{healthValue(hydration)}</div></div>
        </div>
      </Card>
      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 10px" }}>Additional nutrients</h2>
        {remaining.length === 0 ? <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0 }}>The source app did not provide additional nutrients for this day.</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "7px 14px" }}>{remaining.map(([key, value]) => <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: "8px", borderBottom: "1px solid var(--border-color)", padding: "7px 0", fontSize: "0.78rem" }}><span style={{ color: "var(--text-secondary)" }}>{nutritionLabel(key)}</span><strong>{typeof value === "number" ? `${number(value, 2)} ${nutritionUnit(key)}` : value}</strong></div>)}</div>}
      </Card>
    </>}
  </>;
};

const RecoverySection: React.FC<{ logs: HealthLog[] }> = ({ logs }) => {
  const recoveryMetrics: Array<{ metric: HealthLog["metric"]; label: string; digits?: number }> = [
    { metric: "restingHeartRate", label: "Resting heart rate" },
    { metric: "heartRateVariability", label: "HRV (RMSSD)", digits: 1 },
    { metric: "oxygenSaturation", label: "Blood oxygen", digits: 1 },
    { metric: "respiratoryRate", label: "Breathing rate", digits: 1 },
  ];
  const displaySleepLogs = sleepLogsForDisplay(logs);
  const latestSleep = [...displaySleepLogs].sort((left, right) => right.startTime.localeCompare(left.startTime))[0];
  const today = new Date();
  const sleepByDay = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    const entries = displaySleepLogs.filter((entry) => entry.startTime.slice(0, 10) === dateKey(day));
    return { day, minutes: entries.reduce((total, entry) => total + (entry.value || 0), 0) };
  });
  const maxSleep = Math.max(...sleepByDay.map((entry) => entry.minutes), 1);
  const hasRecoveryData = logs.some((entry) => recoveryMetrics.some(({ metric }) => entry.metric === metric) || entry.metric === "sleep");

  return <>
    <Card style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}><Moon size={21} style={{ color: "var(--color-primary)" }} /><h2 style={{ fontSize: "1.08rem", margin: 0 }}>Recovery</h2></div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.45, margin: 0 }}>Sleep and overnight recovery signals imported from Health Connect. Device-specific recovery scores are not standardized by Health Connect, so the underlying readings are shown here.</p>
    </Card>

    {!hasRecoveryData ? <Card><p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", margin: 0 }}>No recovery data has been imported yet. Connect Recovery in Settings, then refresh after Hume has synced to Health Connect.</p></Card> : <>
      <Card style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 10px" }}>Latest recovery signals</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "9px" }}>
          <MetricBlock label="Latest sleep" value={latestSleep?.value !== undefined ? `${number(latestSleep.value / 60, 1)} hr` : "—"} detail={latestSleep ? new Date(latestSleep.startTime).toLocaleDateString() : "Not provided by source"} icon={<Moon size={18} />} />
          {recoveryMetrics.map(({ metric, label, digits }) => {
            const latest = latestHealthLog(logs, metric);
            return <MetricBlock key={metric} label={label} value={healthValue(latest, digits)} detail={latest ? new Date(latest.startTime).toLocaleDateString() : "Not provided by source"} icon={<HeartPulse size={18} />} />;
          })}
        </div>
      </Card>
      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Sleep duration</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", margin: "0 0 13px" }}>Last 7 days of imported sleep sessions.</p>
        <div style={{ height: "180px", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "7px", alignItems: "end" }}>
          {sleepByDay.map(({ day, minutes }) => <div key={dateKey(day)} style={{ minWidth: 0, height: "100%", display: "grid", gridTemplateRows: "20px 1fr 18px", gap: "4px", alignItems: "end", textAlign: "center" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden" }}>{minutes ? `${number(minutes / 60, 1)}h` : ""}</span>
            <div style={{ height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", background: "var(--bg-input)", borderRadius: "7px", overflow: "hidden" }}><div title={`${number(minutes / 60, 1)} hours sleep`} style={{ width: "100%", height: `${minutes ? Math.max(5, (minutes / maxSleep) * 100) : 0}%`, background: "var(--gradient-brand)", borderRadius: "7px 7px 3px 3px", transition: "height 180ms ease" }} /></div>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: dateKey(day) === dateKey(today) ? "var(--color-primary)" : "var(--text-secondary)" }}>{day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</span>
          </div>)}
        </div>
      </Card>
    </>}
  </>;
};

export const HealthTrackerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = getHealthSection(location.search);
  const healthLogs = useLiveQuery(() => db.healthLogs.toArray(), []) ?? [];
  const weightLogs = useLiveQuery(async () => activeRecords(await db.weightLogs.toArray()), []) ?? [];
  const measurementSetting = useLiveQuery(() => db.appSettings.get("pref_measurementSystem"));
  const trackerEnabled = useLiveQuery(() => db.appSettings.get(healthTrackerEnabledKey));
  const birthDateSetting = useLiveQuery(() => db.appSettings.get(healthProfileBirthDateKey));
  const sexSetting = useLiveQuery(() => db.appSettings.get(healthProfileSexKey));
  const heightSetting = useLiveQuery(() => db.appSettings.get(healthProfileHeightCmKey));
  const weightUnit = measurementSetting?.value === "metric" ? "kg" : "lbs";
  const birthDate = typeof birthDateSetting?.value === "string" ? birthDateSetting.value : "";
  const metabolicSex: MetabolicSex = sexSetting?.value === "female" || sexSetting?.value === "male" ? sexSetting.value : "unspecified";
  const profileHeightCm = Number(heightSetting?.value) > 0 ? Number(heightSetting?.value) : null;

  return (
    <div className="fade-in" style={{ paddingBottom: "35px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}><HeartPulse size={28} style={{ color: "var(--color-primary)" }} /><h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", margin: 0 }}>Health</h1></div>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>Body progress, activity, and connected health metrics in one place.</p>
      </div>

      {trackerEnabled?.value !== true && activeSection !== "body" && <Card style={{ marginBottom: "16px", border: "1px solid var(--border-color-focus)" }}><p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.45, margin: 0 }}>Connected health tracking is off. Manual Body Tracker features still work. You can enable connections in <button type="button" onClick={() => navigate("/settings")} style={{ border: 0, background: "none", color: "var(--color-primary)", font: "inherit", fontWeight: 800, padding: 0, cursor: "pointer" }}>Settings</button>.</p></Card>}

      {activeSection === "overview" && <HealthOverview healthLogs={healthLogs} weightLogs={weightLogs} weightUnit={weightUnit} birthDate={birthDate} metabolicSex={metabolicSex} profileHeightCm={profileHeightCm} />}
      {activeSection === "body" && <ProfilePage mode="bodyTracker" />}
      {activeSection === "activity" && <ActivitySection logs={healthLogs} />}
      {activeSection === "nutrition" && <NutritionSection logs={healthLogs} />}
      {activeSection === "recovery" && <RecoverySection logs={healthLogs} />}
    </div>
  );
};
