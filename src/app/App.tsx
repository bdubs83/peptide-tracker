import React, { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { onAuthStateChanged, type User } from "firebase/auth";
import { db } from "../db/db";
import { putAppSetting, resolveAppSettings } from "../db/appSettings";
import { normalizeLegacyPeptideNames } from "../db/nameCleanup";
import {
  autoSyncEnabledKey,
  lastAutoSyncConflictsKey,
  lastAutoSyncErrorKey,
  lastAutoSyncResultKey,
  lastAutoSyncStatusKey,
  runAutoSync,
  subscribeToCloudSyncChanges,
} from "../firebase/cloudSync";
import { firebaseAuth } from "../firebase/firebase";
import { useLayoutMode } from "../hooks/useLayoutMode";
import { AppRoutes } from "./routes";
import { DesktopAppShell, MobileAppShell } from "./AppShells";
import { LayoutModeProvider } from "./LayoutModeContext";
import { ReminderCenter } from "../features/reminders/ReminderCenter";

const themeColors = {
  light: "#f6f8fb",
  dark: "#0d0e15",
  professional: "#0b1220",
  fun: "#fff7ed",
  cottonCandySkies: "#fbf7ff",
  electropop: "#16072f",
  urbanGraffiti: "#101010",
};

const getLatestTimestamp = (records: Array<{ createdAt?: string; updatedAt?: string; deletedAt?: string }>) =>
  records.reduce((latest, record) => {
    const candidate = record.deletedAt || record.updatedAt || record.createdAt || "";
    return candidate > latest ? candidate : latest;
  }, "");

const syncableSettingKeysToIgnore = new Set([
  autoSyncEnabledKey,
  lastAutoSyncConflictsKey,
  "lastAutoSyncAt",
  lastAutoSyncErrorKey,
  lastAutoSyncResultKey,
  lastAutoSyncStatusKey,
  "lastCloudBackupAt",
  "lastCloudRestoreAt",
  "lastCloudMergeAt",
]);

export const App: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const isAutoSyncRunningRef = useRef(false);
  const lastAutoSyncSignatureRef = useRef("");

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://www.youtube.com/@RetaUnfiltered");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appSettings = useLiveQuery(() => db.appSettings.toArray());
  const localSyncSignature = useLiveQuery(async () => {
    const [
      peptides,
      schedules,
      injectionLogs,
      weightLogs,
      stockItems,
      vaultUsers,
      settingsRows,
    ] = await Promise.all([
      db.peptides.toArray(),
      db.schedules.toArray(),
      db.injectionLogs.where("status").notEqual("scheduled").toArray(),
      db.weightLogs.toArray(),
      db.stockItems.toArray(),
      db.vaultUsers.toArray(),
      db.appSettings.toArray(),
    ]);
    const syncableSettings = settingsRows.filter((setting) => !syncableSettingKeysToIgnore.has(setting.key));

    return JSON.stringify({
      peptides: [peptides.length, getLatestTimestamp(peptides)],
      schedules: [schedules.length, getLatestTimestamp(schedules)],
      injectionLogs: [injectionLogs.length, getLatestTimestamp(injectionLogs)],
      weightLogs: [weightLogs.length, getLatestTimestamp(weightLogs)],
      stockItems: [stockItems.length, getLatestTimestamp(stockItems)],
      vaultUsers: [vaultUsers.length, getLatestTimestamp(vaultUsers)],
      appSettings: [syncableSettings.length, getLatestTimestamp(syncableSettings)],
    });
  });
  const isLoaded = appSettings !== undefined;
  const settings = resolveAppSettings(appSettings);
  const autoSyncEnabled = appSettings?.some((item) => item.key === autoSyncEnabledKey && item.value === true) ?? false;
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
    return onAuthStateChanged(firebaseAuth, setCloudUser);
  }, []);

  useEffect(() => {
    if (!autoSyncEnabled || !cloudUser || !localSyncSignature) return;

    const run = async (force = false) => {
      if (isAutoSyncRunningRef.current) return;
      if (!force && lastAutoSyncSignatureRef.current === localSyncSignature) return;
      if ("onLine" in navigator && !navigator.onLine) return;

      isAutoSyncRunningRef.current = true;
      try {
        await putAppSetting(lastAutoSyncStatusKey, "syncing");
        const result = await runAutoSync(cloudUser);
        lastAutoSyncSignatureRef.current = localSyncSignature;
        await putAppSetting(lastAutoSyncResultKey, result);
        await putAppSetting(lastAutoSyncErrorKey, "");
        await putAppSetting(lastAutoSyncStatusKey, result.conflicts > 0 ? "needsReview" : "idle");
      } catch (error) {
        await putAppSetting(lastAutoSyncErrorKey, error instanceof Error ? error.message : "Auto Sync failed.");
        await putAppSetting(lastAutoSyncStatusKey, "error");
      } finally {
        isAutoSyncRunningRef.current = false;
      }
    };

    const timeoutId = window.setTimeout(() => {
      void run();
    }, 1000);
    const intervalId = window.setInterval(() => {
      void run(true);
    }, 30000);
    let cloudSyncTimeoutId: number | undefined;
    const unsubscribeCloudChanges = subscribeToCloudSyncChanges(cloudUser, () => {
      if (cloudSyncTimeoutId) window.clearTimeout(cloudSyncTimeoutId);
      cloudSyncTimeoutId = window.setTimeout(() => {
        void run(true);
      }, 750);
    });
    const handleOnline = () => void run(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void run(true);
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      if (cloudSyncTimeoutId) window.clearTimeout(cloudSyncTimeoutId);
      unsubscribeCloudChanges();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoSyncEnabled, cloudUser, localSyncSignature]);

  return (
    <Shell
      copied={copied}
      onCopyLink={handleCopyLink}
    >
      <LayoutModeProvider value={layoutMode}>
        {isLoaded && <ReminderCenter />}
        <AppRoutes />
      </LayoutModeProvider>
    </Shell>
  );
};
