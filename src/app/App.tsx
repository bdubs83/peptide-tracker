import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { onAuthStateChanged, type User } from "firebase/auth";
import { db } from "../db/db";
import { putAppSetting, resolveAppSettings } from "../db/appSettings";
import { normalizeLegacyPeptideNames } from "../db/nameCleanup";
import { isHealthConnectSupportedPlatform } from "../features/health/healthConnect";
import {
  healthTrackerCategoriesKey,
  healthTrackerEnabledKey,
  recordHealthImportError,
  refreshHealthConnectImport,
} from "../features/health/healthImport";
import type { HealthConnectCategory } from "../features/health/healthConnect";
import {
  autoSyncEnabledKey,
  lastAutoSyncAtKey,
  lastAutoSyncConflictsKey,
  lastAutoSyncErrorKey,
  lastAutoSyncResultKey,
  lastAutoSyncStatusKey,
  lastKnownCloudReplaceAtKey,
  runAutoSync,
  subscribeToCloudSyncChanges,
} from "../firebase/cloudSync";
import { firebaseAuth } from "../firebase/firebase";
import { useLayoutMode } from "../hooks/useLayoutMode";
import { AppRoutes } from "./routes";
import { DesktopAppShell, MobileAppShell } from "./AppShells";
import { LayoutModeProvider } from "./LayoutModeContext";
import { ReminderCenter } from "../features/reminders/ReminderCenter";
import { WelcomeBanner } from "./WelcomeBanner";
import { welcomeNotesSeenVersionKey } from "./welcomeNotes";

const themeColors = {
  light: "#f6f8fb",
  dark: "#0d0e15",
  professional: "#0b1220",
  fun: "#fff7ed",
  cottonCandySkies: "#fbf7ff",
  electropop: "#16072f",
  urbanGraffiti: "#101010",
};

const getRecordTimestamp = (record?: { createdAt?: string; updatedAt?: string; deletedAt?: string }) =>
  record?.deletedAt || record?.updatedAt || record?.createdAt || "";

const getLatestRecordTimestamp = (records: Array<{ createdAt?: string; updatedAt?: string; deletedAt?: string }>) =>
  records.reduce((latest, record) => {
    const timestamp = getRecordTimestamp(record);
    return timestamp > latest ? timestamp : latest;
  }, "");

const syncableSettingKeysToIgnore = new Set([
  autoSyncEnabledKey,
  lastAutoSyncConflictsKey,
  lastAutoSyncAtKey,
  lastAutoSyncErrorKey,
  lastAutoSyncResultKey,
  lastAutoSyncStatusKey,
  lastKnownCloudReplaceAtKey,
  welcomeNotesSeenVersionKey,
  "lastCloudBackupAt",
  "lastCloudRestoreAt",
  "lastCloudMergeAt",
]);

const computeLocalSyncSignature = async () => {
  const [
    peptideCount,
    latestPeptide,
    scheduleCount,
    latestSchedule,
    injectionLogCount,
    latestInjectionLog,
    weightLogCount,
    latestWeightLog,
    healthLogCount,
    latestHealthLog,
    stockItemCount,
    latestStockItem,
    bacWaterVialCount,
    latestBacWaterVial,
    bacWaterStockCount,
    latestBacWaterStock,
    vaultUserCount,
    latestVaultUser,
    settingsRows,
  ] = await Promise.all([
    db.peptides.count(),
    db.peptides.orderBy("updatedAt").last(),
    db.schedules.count(),
    db.schedules.orderBy("updatedAt").last(),
    db.injectionLogs.where("status").notEqual("scheduled").count(),
    db.injectionLogs.orderBy("updatedAt").last(),
    db.weightLogs.count(),
    db.weightLogs.orderBy("updatedAt").last(),
    db.healthLogs.count(),
    db.healthLogs.orderBy("updatedAt").last(),
    db.stockItems.count(),
    db.stockItems.orderBy("updatedAt").last(),
    db.bacWaterVials.count(),
    db.bacWaterVials.orderBy("updatedAt").last(),
    db.bacWaterStockItems.count(),
    db.bacWaterStockItems.orderBy("updatedAt").last(),
    db.vaultUsers.count(),
    db.vaultUsers.orderBy("updatedAt").last(),
    db.appSettings.toArray(),
  ]);
  const syncableSettings = settingsRows.filter((setting) => !syncableSettingKeysToIgnore.has(setting.key));

  return JSON.stringify({
    peptides: [peptideCount, getRecordTimestamp(latestPeptide)],
    schedules: [scheduleCount, getRecordTimestamp(latestSchedule)],
    injectionLogs: [injectionLogCount, getRecordTimestamp(latestInjectionLog)],
    weightLogs: [weightLogCount, getRecordTimestamp(latestWeightLog)],
    healthLogs: [healthLogCount, getRecordTimestamp(latestHealthLog)],
    stockItems: [stockItemCount, getRecordTimestamp(latestStockItem)],
    bacWaterVials: [bacWaterVialCount, getRecordTimestamp(latestBacWaterVial)],
    bacWaterStockItems: [bacWaterStockCount, getRecordTimestamp(latestBacWaterStock)],
    vaultUsers: [vaultUserCount, getRecordTimestamp(latestVaultUser)],
    appSettings: [syncableSettings.length, getLatestRecordTimestamp(syncableSettings)],
  });
};

export const App: React.FC = () => {
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const isAutoSyncRunningRef = useRef(false);
  const lastAutoSyncSignatureRef = useRef("");
  const runAutoSyncRef = useRef<((force?: boolean) => Promise<void>) | undefined>(undefined);

  const appSettings = useLiveQuery(() => db.appSettings.toArray());
  const localSyncSignature = useLiveQuery(computeLocalSyncSignature);
  const isLoaded = appSettings !== undefined;
  const settings = resolveAppSettings(appSettings);
  const autoSyncEnabled = appSettings?.some((item) => item.key === autoSyncEnabledKey && item.value === true) ?? false;
  const healthTrackerEnabled = appSettings?.some((item) => item.key === healthTrackerEnabledKey && item.value === true) ?? false;
  const healthTrackerCategories = appSettings?.find((item) => item.key === healthTrackerCategoriesKey)?.value;
  const layoutMode = useLayoutMode(settings.layoutMode);
  const Shell = layoutMode === "desktop" ? DesktopAppShell : MobileAppShell;

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    const themeColor = themeColors[settings.theme];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [settings.theme]);

  useEffect(() => {
    void normalizeLegacyPeptideNames();
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.update();
        }
      }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, setCloudUser);
  }, []);

  const runAutoSyncNow = useCallback(async (force = false) => {
    if (!autoSyncEnabled || !cloudUser || !localSyncSignature) return;
    if (isAutoSyncRunningRef.current) return;
    if (!force && lastAutoSyncSignatureRef.current === localSyncSignature) return;
    if ("onLine" in navigator && !navigator.onLine) return;

    isAutoSyncRunningRef.current = true;
    try {
      await putAppSetting(lastAutoSyncStatusKey, "syncing");
      const result = await runAutoSync(cloudUser);
      lastAutoSyncSignatureRef.current = await computeLocalSyncSignature();
      await putAppSetting(lastAutoSyncResultKey, result);
      await putAppSetting(lastAutoSyncErrorKey, "");
      await putAppSetting(lastAutoSyncStatusKey, result.conflicts > 0 ? "needsReview" : "idle");
    } catch (error) {
      await putAppSetting(lastAutoSyncErrorKey, error instanceof Error ? error.message : "Auto Sync failed.");
      await putAppSetting(lastAutoSyncStatusKey, "error");
    } finally {
      isAutoSyncRunningRef.current = false;
    }
  }, [autoSyncEnabled, cloudUser, localSyncSignature]);

  useEffect(() => {
    runAutoSyncRef.current = runAutoSyncNow;
  }, [runAutoSyncNow]);

  useEffect(() => {
    if (!autoSyncEnabled || !cloudUser || !localSyncSignature) return;

    const timeoutId = window.setTimeout(() => {
      void runAutoSyncNow();
    }, 1000);
    // Keep the background check light. Local changes, cloud changes, reconnects,
    // and returning to the app already trigger an immediate sync. The periodic
    // check only runs when the lightweight local signature has changed.
    const intervalId = window.setInterval(() => {
      void runAutoSyncNow();
    }, 5 * 60 * 1000);
    const handleOnline = () => void runAutoSyncNow(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void runAutoSyncNow(true);
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoSyncEnabled, cloudUser, localSyncSignature, runAutoSyncNow]);

  useEffect(() => {
    if (!autoSyncEnabled || !cloudUser) return;

    let cloudSyncTimeoutId: number | undefined;
    const unsubscribeCloudChanges = subscribeToCloudSyncChanges(cloudUser, () => {
      if (cloudSyncTimeoutId) window.clearTimeout(cloudSyncTimeoutId);
      cloudSyncTimeoutId = window.setTimeout(() => {
        void runAutoSyncRef.current?.(true);
      }, 750);
    }, (error) => {
      void putAppSetting(lastAutoSyncErrorKey, error.message || "Auto Sync listener failed.");
      void putAppSetting(lastAutoSyncStatusKey, "error");
    });

    return () => {
      if (cloudSyncTimeoutId) window.clearTimeout(cloudSyncTimeoutId);
      unsubscribeCloudChanges();
    };
  }, [autoSyncEnabled, cloudUser]);

  useEffect(() => {
    if (!isHealthConnectSupportedPlatform() || !healthTrackerEnabled || !Array.isArray(healthTrackerCategories) || healthTrackerCategories.length === 0) return;
    const categories = healthTrackerCategories.filter((value): value is HealthConnectCategory => value === "body" || value === "activity" || value === "nutrition" || value === "recovery");
    if (!categories.length) return;

    let refreshInProgress = false;
    const refresh = async () => {
      if (refreshInProgress || document.visibilityState !== "visible") return;
      refreshInProgress = true;
      try {
        await refreshHealthConnectImport(categories);
      } catch (error) {
        await recordHealthImportError(error);
      } finally {
        refreshInProgress = false;
      }
    };
    const intervalId = window.setInterval(() => void refresh(), 15 * 60 * 1000);
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void refresh();
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [healthTrackerEnabled, healthTrackerCategories]);

  return (
    <Shell>
      <LayoutModeProvider value={layoutMode}>
        {isLoaded && <ReminderCenter />}
        <AppRoutes />
        {isLoaded && <WelcomeBanner settings={appSettings} />}
      </LayoutModeProvider>
    </Shell>
  );
};
