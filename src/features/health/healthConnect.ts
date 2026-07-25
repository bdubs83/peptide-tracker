import { Capacitor, registerPlugin } from "@capacitor/core";
import type { HealthLog, HealthMetricType } from "../../types/healthLog";

type HealthConnectStatus = "available" | "update_required" | "unavailable";
export type HealthConnectCategory = "body" | "activity" | "nutrition" | "recovery";

export type HealthConnectMeasurement = {
  date: string;
  time: string;
  weightKg: number;
  bodyFatPercent?: number;
};

export type ImportedHealthLog = Omit<HealthLog, "id" | "source" | "createdAt" | "updatedAt"> & {
  metric: HealthMetricType;
};

type HealthConnectPlugin = {
  getStatus(): Promise<{ status: HealthConnectStatus }>;
  requestHealthPermissions(options: { categories: HealthConnectCategory[] }): Promise<{ granted: boolean; grantedPermissions: string[] }>;
  importHealthData(options: { categories: HealthConnectCategory[] }): Promise<{
    measurements: HealthConnectMeasurement[];
    healthLogs: ImportedHealthLog[];
  }>;
};

const HealthConnect = registerPlugin<HealthConnectPlugin>("HealthConnect");

export const isHealthConnectSupportedPlatform = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const getHealthConnectStatus = () => HealthConnect.getStatus();
export const requestHealthConnectPermissions = (categories: HealthConnectCategory[]) =>
  HealthConnect.requestHealthPermissions({ categories });
export const importHealthConnectData = (categories: HealthConnectCategory[]) =>
  HealthConnect.importHealthData({ categories });
