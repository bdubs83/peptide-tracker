import { putAppSetting } from "../../db/appSettings";
import { db } from "../../db/db";
import type { WeightLog } from "../../types/weightLog";
import {
  importHealthConnectData,
  type HealthConnectCategory,
  type HealthConnectMeasurement,
  type ImportedHealthLog,
} from "./healthConnect";

export const healthTrackerEnabledKey = "health_tracker_enabled";
export const healthTrackerCategoriesKey = "health_tracker_categories";
export const healthTrackerLastRefreshKey = "health_tracker_last_refresh";
export const healthTrackerLastRefreshErrorKey = "health_tracker_last_refresh_error";

const saveBodyMeasurements = async (measurements: HealthConnectMeasurement[]) => {
  const measurementSetting = await db.appSettings.get("pref_measurementSystem");
  const isMetric = measurementSetting?.value === "metric";
  let added = 0;
  let updated = 0;

  for (const measurement of measurements) {
    const weight = isMetric ? measurement.weightKg : measurement.weightKg * 2.2046226218;
    const existing = await db.weightLogs.where("date").equals(measurement.date).filter((entry) => entry.time === measurement.time && !entry.deletedAt).first();
    const now = new Date().toISOString();
    if (existing?.source === "healthConnect") {
      await db.weightLogs.update(existing.id, { weight: weight.toFixed(1), bodyFat: measurement.bodyFatPercent?.toFixed(1) ?? existing.bodyFat, source: "healthConnect", updatedAt: now });
      updated += 1;
    } else if (!existing) {
      const newLog: WeightLog = { id: crypto.randomUUID(), date: measurement.date, time: measurement.time, weight: weight.toFixed(1), bodyFat: measurement.bodyFatPercent?.toFixed(1), source: "healthConnect", createdAt: now, updatedAt: now };
      await db.weightLogs.add(newLog);
      added += 1;
    }
  }
  return { added, updated };
};

const saveHealthLogs = async (logs: ImportedHealthLog[], categories: HealthConnectCategory[]) => {
  const now = new Date().toISOString();
  let added = 0;

  // A refresh can legitimately return no records while the source app is still
  // writing to Health Connect. Upsert returned records instead of clearing an
  // entire category first; otherwise a transient empty response erases the
  // last successfully imported step totals.
  await db.transaction("rw", db.healthLogs, async () => {
    // A successful recovery refresh returns Health Connect's deduplicated daily
    // sleep totals. Replace every prior Health Connect sleep representation so
    // raw fragments and the obsolete manual-merge totals cannot be mixed in.
    if (categories.includes("recovery") && logs.some((log) => log.metric === "sleep")) {
      const legacySleepLogs = await db.healthLogs
        .filter((entry) => entry.source === "healthConnect" && entry.metric === "sleep")
        .toArray();
      await db.healthLogs.bulkDelete(legacySleepLogs.map((entry) => entry.id));
    }
    for (const log of logs) {
      const id = `healthconnect:${log.metric}:${log.sourceRecordId || log.startTime}`;
      const existing = await db.healthLogs.get(id);
      await db.healthLogs.put({ ...log, id, source: "healthConnect", createdAt: existing?.createdAt || now, updatedAt: now });
      added += 1;
    }
  });
  return added;
};

export type HealthImportResult = {
  bodyAdded: number;
  bodyUpdated: number;
  healthLogsAdded: number;
};

export async function refreshHealthConnectImport(categories: HealthConnectCategory[]): Promise<HealthImportResult> {
  const { measurements, healthLogs } = await importHealthConnectData(categories);
  const bodyResult = categories.includes("body") ? await saveBodyMeasurements(measurements) : { added: 0, updated: 0 };
  const healthLogsAdded = await saveHealthLogs(healthLogs, categories);
  await putAppSetting(healthTrackerLastRefreshKey, new Date().toISOString());
  await putAppSetting(healthTrackerLastRefreshErrorKey, "");
  return { bodyAdded: bodyResult.added, bodyUpdated: bodyResult.updated, healthLogsAdded };
}

export async function recordHealthImportError(error: unknown) {
  await putAppSetting(healthTrackerLastRefreshErrorKey, error instanceof Error ? error.message : "Unable to refresh Health Connect.");
}
