import { db } from "./db";
import type { AppSetting, AppSettings, AppTheme, LayoutMode } from "./schema";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: "main",
  disclaimerAccepted: false,
  layoutMode: "auto",
  theme: "dark",
};

const isLayoutMode = (value: unknown): value is LayoutMode =>
  value === "auto" || value === "mobile" || value === "desktop";

export const isAppTheme = (value: unknown): value is AppTheme =>
  value === "light" ||
  value === "dark" ||
  value === "professional" ||
  value === "fun" ||
  value === "cottonCandySkies" ||
  value === "electropop" ||
  value === "urbanGraffiti";

const isMainSettingsRow = (setting: AppSetting): setting is AppSetting & AppSettings =>
  setting.key === "main" &&
  setting.id === "main" &&
  typeof setting.disclaimerAccepted === "boolean" &&
  isLayoutMode(setting.layoutMode) &&
  isAppTheme(setting.theme);

export const resolveAppSettings = (settings: AppSetting[] = []): AppSettings => {
  const mainSettings = settings.find(isMainSettingsRow);
  const legacyDisclaimer = settings.some(
    (setting) => setting.key === "disclaimerAccepted" && setting.value === true
  );

  return {
    ...DEFAULT_APP_SETTINGS,
    ...mainSettings,
    disclaimerAccepted: mainSettings?.disclaimerAccepted ?? legacyDisclaimer,
    layoutMode: isLayoutMode(mainSettings?.layoutMode) ? mainSettings.layoutMode : "auto",
    theme: isAppTheme(mainSettings?.theme) ? mainSettings.theme : "dark",
  };
};

export const getAppSettings = async () => {
  return resolveAppSettings(await db.appSettings.toArray());
};

export const updateAppSettings = async (updates: Partial<Omit<AppSettings, "id">>) => {
  const current = await getAppSettings();
  const next: AppSettings = {
    ...current,
    ...updates,
    id: "main",
  };

  await db.appSettings.put({
    key: "main",
    value: "main",
    ...next,
  });

  return next;
};
