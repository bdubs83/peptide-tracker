import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type PermissionStatus } from "@capacitor/local-notifications";

export type DeviceNotificationPermission = "unsupported" | "default" | "granted" | "denied";

const reminderChannelId = "injection-reminders";

const isNativeApp = () => Capacitor.isNativePlatform();

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
