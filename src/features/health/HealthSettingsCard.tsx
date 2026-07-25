import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Apple, Footprints, Moon, Scale, Trash2, Watch } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { putAppSetting } from "../../db/appSettings";
import { db } from "../../db/db";
import {
  getHealthConnectStatus,
  isHealthConnectSupportedPlatform,
  requestHealthConnectPermissions,
  type HealthConnectCategory,
} from "./healthConnect";
import {
  healthTrackerCategoriesKey,
  healthTrackerEnabledKey,
  healthTrackerLastRefreshErrorKey,
  healthTrackerLastRefreshKey,
  recordHealthImportError,
  refreshHealthConnectImport,
} from "./healthImport";
import {
  healthProfileBirthDateKey,
  healthProfileHeightCmKey,
  healthProfileSexKey,
  type MetabolicSex,
} from "./healthCalculations";
import { changeBodyMeasurementSystem, measurementSystemKey, type MeasurementSystem } from "./measurementSystem";

const trackerCategories: Array<{ id: HealthConnectCategory; title: string; metrics: string; Icon: typeof Scale }> = [
  { id: "body", title: "Body Tracker", metrics: "Weight, body fat, lean mass, height", Icon: Scale },
  { id: "activity", title: "Activity", metrics: "Steps, active calories, workouts", Icon: Footprints },
  { id: "nutrition", title: "Nutrition", metrics: "Calories, macros, micronutrients, hydration", Icon: Apple },
  { id: "recovery", title: "Recovery", metrics: "Sleep, resting heart rate, HRV, oxygen, breathing", Icon: Moon },
];

export const HealthSettingsCard: React.FC<{ section?: "profile" | "tracking" | "all" }> = ({ section = "all" }) => {
  const enabledSetting = useLiveQuery(() => db.appSettings.get(healthTrackerEnabledKey));
  const categorySetting = useLiveQuery(() => db.appSettings.get(healthTrackerCategoriesKey));
  const lastRefresh = useLiveQuery(() => db.appSettings.get(healthTrackerLastRefreshKey));
  const lastRefreshError = useLiveQuery(() => db.appSettings.get(healthTrackerLastRefreshErrorKey));
  const birthDateSetting = useLiveQuery(() => db.appSettings.get(healthProfileBirthDateKey));
  const sexSetting = useLiveQuery(() => db.appSettings.get(healthProfileSexKey));
  const heightSetting = useLiveQuery(() => db.appSettings.get(healthProfileHeightCmKey));
  const measurementSetting = useLiveQuery(() => db.appSettings.get(measurementSystemKey));
  const healthLogCount = useLiveQuery(() => db.healthLogs.count()) ?? 0;
  const isEnabled = enabledSetting?.value === true;
  const enabledCategories = Array.isArray(categorySetting?.value)
    ? categorySetting.value.filter((value): value is HealthConnectCategory => value === "body" || value === "activity" || value === "nutrition" || value === "recovery")
    : [];
  const [status, setStatus] = useState<"available" | "update_required" | "unavailable" | "desktop">("desktop");
  const [busyCategory, setBusyCategory] = useState<HealthConnectCategory | null>(null);
  const [message, setMessage] = useState("");
  const isMetric = measurementSetting?.value === "metric";
  const birthDate = typeof birthDateSetting?.value === "string" ? birthDateSetting.value : "";
  const metabolicSex: MetabolicSex = sexSetting?.value === "female" || sexSetting?.value === "male" ? sexSetting.value : "unspecified";
  const storedHeightCm = Number(heightSetting?.value);
  const heightInput = storedHeightCm > 0 ? (isMetric ? storedHeightCm : storedHeightCm / 2.54).toFixed(1) : "";

  useEffect(() => {
    if (!isHealthConnectSupportedPlatform()) return;
    void getHealthConnectStatus().then((result) => setStatus(result.status)).catch(() => setStatus("unavailable"));
  }, []);

  const connectCategory = async (category: HealthConnectCategory) => {
    setBusyCategory(category);
    setMessage("");
    try {
      const permission = await requestHealthConnectPermissions([category]);
      if (!permission.granted) {
        setMessage("Health Connect permission was not granted.");
        return;
      }
      const result = await refreshHealthConnectImport([category]);
      await putAppSetting(healthTrackerCategoriesKey, [...new Set([...enabledCategories, category])]);
      await putAppSetting(healthTrackerEnabledKey, true);
      setMessage(category === "body" ? `Body Tracker updated: ${result.bodyAdded} added, ${result.bodyUpdated} refreshed.` : `${category === "nutrition" ? "Nutrition" : category === "recovery" ? "Recovery" : "Activity"} data refreshed.`);
    } catch (error) {
      await recordHealthImportError(error);
      setMessage(error instanceof Error ? error.message : "Unable to connect to Health Connect.");
    } finally {
      setBusyCategory(null);
    }
  };

  const removeImports = async () => {
    if (!confirm("Remove all Health Connect imports from this device? Manual Body Tracker logs will be kept.")) return;
    await db.transaction("rw", [db.healthLogs, db.weightLogs], async () => {
      await db.healthLogs.clear();
      const importedWeights = await db.weightLogs.filter((entry) => entry.source === "healthConnect").toArray();
      await db.weightLogs.bulkDelete(importedWeights.map((entry) => entry.id));
    });
    await putAppSetting(healthTrackerCategoriesKey, []);
    setMessage("Health Connect imports removed. Manual Body Tracker logs were kept.");
  };

  const changeMeasurementSystem = async (value: string) => {
    if (value !== "imperial" && value !== "metric") return;
    await changeBodyMeasurementSystem(value as MeasurementSystem);
    setMessage(`Body measurements are now shown in ${value === "metric" ? "metric units (kg and cm)" : "imperial units (lbs and inches)"}. Peptide doses remain in mg, mcg, and mL.`);
  };

  const platformLabel = status === "available" ? "Health Connect is ready" : status === "update_required" ? "Health Connect needs an update" : status === "desktop" ? "Connections are available in the Android app" : "Health Connect is unavailable on this device";

  return (
    <Card style={{ marginBottom: "20px" }}>
      {section !== "tracking" && <div style={{ marginBottom: section === "all" ? "16px" : 0 }}>
        <h2 style={{ fontSize: "1.2rem", margin: "0 0 6px" }}>Health Profile</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.45, margin: "0 0 12px" }}>Used for BMI and estimated resting-energy calculations. Birth date is stored so age stays current. The sex selection is used only by the metabolic equation.</p>
        <div className="form-row-grid">
          <Select label="Body measurement system" value={isMetric ? "metric" : "imperial"} onChange={(event) => { void changeMeasurementSystem(event.target.value); }} options={[{ value: "imperial", label: "Imperial (lbs, inches)" }, { value: "metric", label: "Metric (kg, cm)" }]} />
          <Input label="Birth date" type="date" value={birthDate} onChange={(event) => { void putAppSetting(healthProfileBirthDateKey, event.target.value); }} />
          <Select label="Sex used for RMR" value={metabolicSex} onChange={(event) => { void putAppSetting(healthProfileSexKey, event.target.value as MetabolicSex); }} options={[{ value: "unspecified", label: "Prefer not to specify" }, { value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
          <Input key={`${isMetric}-${storedHeightCm}`} label={`Height (${isMetric ? "cm" : "in"})`} type="number" inputMode="decimal" min="1" defaultValue={heightInput} onBlur={(event) => { const value = Number(event.target.value); void putAppSetting(healthProfileHeightCmKey, value > 0 ? (isMetric ? value : value * 2.54) : ""); }} suffix={isMetric ? "cm" : "in"} />
        </div>
      </div>}

      {section !== "profile" && <div style={{ borderTop: section === "all" ? "1px solid var(--border-color)" : 0, paddingTop: section === "all" ? "16px" : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}><Watch size={20} style={{ color: "var(--color-primary)" }} /> Health Tracking</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.45, margin: "6px 0 0" }}>{platformLabel}. Choose which categories the app may refresh.</p>
        </div>
        <button type="button" className={`btn ${isEnabled ? "btn-success" : "btn-secondary"}`} onClick={() => void putAppSetting(healthTrackerEnabledKey, !isEnabled)} style={{ minWidth: "70px" }}>{isEnabled ? "On" : "Off"}</button>
      </div>

      <div style={{ display: "grid", gap: "9px" }}>
        {trackerCategories.map(({ id, title, metrics, Icon }) => {
          const connected = enabledCategories.includes(id);
          const unavailable = !isHealthConnectSupportedPlatform() || status !== "available";
          return <div key={id} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "12px", background: "var(--bg-input)", display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: "10px", alignItems: "center" }}>
            <Icon size={19} style={{ color: "var(--color-primary)" }} />
            <div><div style={{ fontWeight: 800 }}>{title}{connected && <span style={{ color: "var(--color-success)", fontSize: "0.7rem", marginLeft: "7px" }}>CONNECTED</span>}</div><div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "3px" }}>{metrics}</div></div>
            <Button variant="secondary" onClick={() => void connectCategory(id)} disabled={busyCategory !== null || unavailable}>{busyCategory === id ? "Importing…" : connected ? "Refresh" : "Connect"}</Button>
          </div>;
        })}
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", lineHeight: 1.4, margin: "12px 0 0" }}>
        {typeof lastRefresh?.value === "string" ? `Last refresh: ${new Date(lastRefresh.value).toLocaleString()}. ` : "No completed refresh yet. "}
        Connected categories refresh while the app is open.
        {typeof lastRefreshError?.value === "string" && lastRefreshError.value ? ` Last issue: ${lastRefreshError.value}` : ""}
      </p>
      {message && <p role="status" style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "10px 0 0" }}>{message}</p>}
      <Button variant="secondary" onClick={() => void removeImports()} disabled={healthLogCount === 0} style={{ marginTop: "12px" }}><Trash2 size={16} /> Remove Health Connect imports</Button>
      </div>}
    </Card>
  );
};
