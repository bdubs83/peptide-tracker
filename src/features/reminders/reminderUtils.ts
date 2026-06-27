import type { AppSetting } from "../../db/schema";

export type ReminderTiming = "dayOf" | "atTime" | "30min" | "1hour" | "2hours" | "dayBefore";
export type InAppReminderWindow = "12hour" | "24hour" | "3day";
export type DeviceReminderLead = "15min" | "30min" | "1hour" | "2hours";
export type SecondaryDeviceReminderLead = "none" | "15min" | "30min" | "1hour" | "atTime";

export type ReminderPreferences = {
  inAppEnabled: boolean;
  deviceEnabled: boolean;
  inAppWindow: InAppReminderWindow;
  devicePrimaryLead: DeviceReminderLead;
  deviceSecondaryLead: SecondaryDeviceReminderLead;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  inAppEnabled: true,
  deviceEnabled: false,
  inAppWindow: "24hour",
  devicePrimaryLead: "30min",
  deviceSecondaryLead: "none",
};

export const isReminderTiming = (value: unknown): value is ReminderTiming =>
  value === "dayOf" ||
  value === "atTime" ||
  value === "30min" ||
  value === "1hour" ||
  value === "2hours" ||
  value === "dayBefore";

export const isInAppReminderWindow = (value: unknown): value is InAppReminderWindow =>
  value === "12hour" || value === "24hour" || value === "3day";

export const isDeviceReminderLead = (value: unknown): value is DeviceReminderLead =>
  value === "15min" || value === "30min" || value === "1hour" || value === "2hours";

export const isSecondaryDeviceReminderLead = (value: unknown): value is SecondaryDeviceReminderLead =>
  value === "none" || value === "15min" || value === "30min" || value === "1hour" || value === "atTime";

export const getReminderLeadMinutes = (timing: ReminderTiming | DeviceReminderLead | SecondaryDeviceReminderLead) => {
  if (timing === "15min") return 15;
  if (timing === "30min") return 30;
  if (timing === "1hour") return 60;
  if (timing === "2hours") return 120;
  return 0;
};

export const getInAppReminderWindowMinutes = (window: InAppReminderWindow) => {
  if (window === "12hour") return 12 * 60;
  if (window === "3day") return 3 * 24 * 60;
  return 24 * 60;
};

const legacyTimingToInAppWindow = (timing: ReminderTiming | undefined): InAppReminderWindow | undefined => {
  if (timing === "dayBefore") return "3day";
  if (timing) return "24hour";
  return undefined;
};

const legacyTimingToDevicePrimaryLead = (timing: ReminderTiming | undefined): DeviceReminderLead | undefined => {
  if (timing === "2hours") return "2hours";
  if (timing === "1hour") return "1hour";
  if (timing === "30min") return "30min";
  return undefined;
};

export const resolveReminderPreferences = (settings: AppSetting[] = []): ReminderPreferences => {
  const inAppSetting = settings.find((setting) => setting.key === "reminders_inAppEnabled");
  const deviceSetting = settings.find((setting) => setting.key === "reminders_deviceEnabled");
  const timingSetting = settings.find((setting) => setting.key === "reminders_timing");
  const inAppWindowSetting = settings.find((setting) => setting.key === "reminders_inAppWindow");
  const devicePrimarySetting = settings.find((setting) => setting.key === "reminders_devicePrimaryLead");
  const deviceSecondarySetting = settings.find((setting) => setting.key === "reminders_deviceSecondaryLead");
  const legacyLeadTimeSetting = settings.find((setting) => setting.key === "reminders_leadTime");
  const legacyTiming =
    legacyLeadTimeSetting?.value === "dayBefore"
      ? "dayBefore"
      : legacyLeadTimeSetting?.value === "sameDay"
        ? "dayOf"
        : undefined;

  return {
    inAppEnabled:
      typeof inAppSetting?.value === "boolean"
        ? inAppSetting.value
        : DEFAULT_REMINDER_PREFERENCES.inAppEnabled,
    deviceEnabled:
      typeof deviceSetting?.value === "boolean"
        ? deviceSetting.value
        : DEFAULT_REMINDER_PREFERENCES.deviceEnabled,
    inAppWindow: isInAppReminderWindow(inAppWindowSetting?.value)
      ? inAppWindowSetting.value
      : legacyTimingToInAppWindow(isReminderTiming(timingSetting?.value) ? timingSetting.value : legacyTiming) ||
        DEFAULT_REMINDER_PREFERENCES.inAppWindow,
    devicePrimaryLead: isDeviceReminderLead(devicePrimarySetting?.value)
      ? devicePrimarySetting.value
      : legacyTimingToDevicePrimaryLead(isReminderTiming(timingSetting?.value) ? timingSetting.value : legacyTiming) ||
        DEFAULT_REMINDER_PREFERENCES.devicePrimaryLead,
    deviceSecondaryLead: isSecondaryDeviceReminderLead(deviceSecondarySetting?.value)
      ? deviceSecondarySetting.value
      : DEFAULT_REMINDER_PREFERENCES.deviceSecondaryLead,
  };
};
