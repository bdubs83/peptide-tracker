import { db } from "../../db/db";
import type { WeightLog } from "../../types/weightLog";

export type MeasurementSystem = "imperial" | "metric";

export const measurementSystemKey = "pref_measurementSystem";

const weightFactor = 2.2046226218;
const lengthFields: Array<keyof Pick<WeightLog, "waist" | "chest" | "neck" | "arm" | "thigh">> = ["waist", "chest", "neck", "arm", "thigh"];

export const isMeasurementSystem = (value: unknown): value is MeasurementSystem =>
  value === "imperial" || value === "metric";

const convertNumber = (value: string | undefined, factor: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? (number * factor).toFixed(1) : value;
};

export async function changeBodyMeasurementSystem(target: MeasurementSystem) {
  const currentSetting = await db.appSettings.get(measurementSystemKey);
  const current: MeasurementSystem = isMeasurementSystem(currentSetting?.value) ? currentSetting.value : "imperial";
  if (current === target) return;

  const weightFactorForTarget = target === "metric" ? 1 / weightFactor : weightFactor;
  const lengthFactorForTarget = target === "metric" ? 2.54 : 1 / 2.54;
  const now = new Date().toISOString();

  await db.transaction("rw", [db.appSettings, db.weightLogs], async () => {
    const logs = await db.weightLogs.toArray();
    for (const log of logs) {
      const converted: Partial<WeightLog> = { weight: convertNumber(log.weight, weightFactorForTarget), updatedAt: now };
      for (const field of lengthFields) converted[field] = convertNumber(log[field], lengthFactorForTarget);
      if (log.customMeasurements) {
        converted.customMeasurements = Object.fromEntries(
          Object.entries(log.customMeasurements).map(([label, value]) => [label, convertNumber(value, lengthFactorForTarget) || value])
        );
      }
      await db.weightLogs.update(log.id, converted);
    }

    for (const key of ["tracker_goalWeight", "tracker_startWeight"]) {
      const setting = await db.appSettings.get(key);
      if (typeof setting?.value === "string") {
        await db.appSettings.update(key, { value: convertNumber(setting.value, weightFactorForTarget), updatedAt: now });
      }
    }

    await db.appSettings.put({
      ...currentSetting,
      key: measurementSystemKey,
      value: target,
      createdAt: currentSetting?.createdAt || now,
      updatedAt: now,
      deletedAt: undefined,
    });
  });
}
