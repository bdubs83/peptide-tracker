import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type PermissionStatus } from "@capacitor/local-notifications";

export type DeviceNotificationPermission = "unsupported" | "default" | "granted" | "denied";
export type NativeReminderPlan = {
  key: string;
  title: string;
  body: string;
  at: Date;
};

const reminderChannelId = "injection-reminders";
const scheduledReminderSource = "inner-circle-scheduled-reminder";
const maxPendingNativeReminders = 60;

const isNativeApp = () => Capacitor.isNativePlatform();
export const isNativeNotificationPlatform = isNativeApp;

const mapNativePermission = (permission: PermissionStatus["display"]): DeviceNotificationPermission => {
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return "default";
};

const getWebNotificationPermission = (): DeviceNotificationPermission => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

export const getDeviceNotificationPermission = async (): Promise<DeviceNotificationPermission> => {
  if (!isNativeApp()) return getWebNotificationPermission();

  try {
    const permission = await LocalNotifications.checkPermissions();
    return mapNativePermission(permission.display);
  } catch {
    return "unsupported";
  }
};

export const requestDeviceNotificationPermission = async (): Promise<DeviceNotificationPermission> => {
  if (!isNativeApp()) {
    if (!("Notification" in window)) return "unsupported";
    return Notification.requestPermission();
  }

  try {
    const permission = await LocalNotifications.requestPermissions();
    return mapNativePermission(permission.display);
  } catch {
    return "unsupported";
  }
};

export const getDeviceNotificationPlatformLabel = () => (isNativeApp() ? "this app" : "this browser");

const ensureNativeReminderChannel = async () => {
  if (Capacitor.getPlatform() !== "android") return;

  try {
    await LocalNotifications.createChannel({
      id: reminderChannelId,
      name: "Injection Reminders",
      description: "Alerts before scheduled injection times.",
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#6366f1",
    });
  } catch {
    // Channel creation is best-effort; default native notification behavior still works.
  }
};

const stableNotificationId = (key: string) => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 1_000_000_000 + ((hash >>> 0) % 1_000_000_000);
};

export const replaceNativeReminderSchedule = async (plans: NativeReminderPlan[]) => {
  if (!isNativeApp()) return;

  const pending = await LocalNotifications.getPending();
  const ownedNotifications = pending.notifications
    .filter((notification) => notification.extra?.source === scheduledReminderSource)
    .map(({ id }) => ({ id }));

  if (ownedNotifications.length > 0) {
    await LocalNotifications.cancel({ notifications: ownedNotifications });
  }

  const permission = await getDeviceNotificationPermission();
  if (permission !== "granted" || plans.length === 0) return;

  await ensureNativeReminderChannel();
  const now = Date.now();
  const notifications = plans
    .filter((plan) => plan.at.getTime() > now)
    .sort((left, right) => left.at.getTime() - right.at.getTime())
    .slice(0, maxPendingNativeReminders)
    .map((plan) => ({
      id: stableNotificationId(plan.key),
      title: plan.title,
      body: plan.body,
      largeBody: plan.body,
      channelId: reminderChannelId,
      autoCancel: true,
      schedule: {
        at: plan.at,
        allowWhileIdle: true,
      },
      extra: {
        source: scheduledReminderSource,
        key: plan.key,
      },
    }));

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
};

const showNativeNotification = async (title: string, body: string) => {
  const permission = await getDeviceNotificationPermission();
  if (permission !== "granted") return;

  await ensureNativeReminderChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 2147483647,
        title,
        body,
        largeBody: body,
        channelId: reminderChannelId,
        autoCancel: true,
      },
    ],
  });
};

const showWebNotification = async (title: string, body: string) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "inner-circle-injection-reminder",
        });
        return;
      }
    } catch {
      // Keep desktop reminders working if a stale service worker path fails.
    }
  }

  new Notification(title, {
    body,
    icon: "/icon-192.png",
    tag: "inner-circle-injection-reminder",
  });
};

export const showDeviceNotification = async (title: string, body: string) => {
  if (isNativeApp()) {
    await showNativeNotification(title, body);
    return;
  }

  await showWebNotification(title, body);
};
