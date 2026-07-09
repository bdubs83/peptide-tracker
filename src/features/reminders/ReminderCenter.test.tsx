/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { showDeviceNotification } from "./deviceNotifications";

const installMockNotification = () => {
  const notifications: Array<{ title: string; body?: string }> = [];
  const notificationCalls = vi.fn();
  class MockNotification {
    static permission = "granted";

    constructor(title: string, options?: NotificationOptions) {
      notificationCalls(title, options);
      notifications.push({ title, body: options?.body });
    }
  }
  Object.defineProperty(MockNotification, "permission", {
    configurable: true,
    value: "granted",
  });
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: MockNotification,
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: MockNotification,
  });

  return { MockNotification, notificationCalls, notifications };
};

describe("showDeviceNotification", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error Reset test-only browser API override.
    delete navigator.serviceWorker;
  });

  it("falls back to the Notification API when no service worker is registered", async () => {
    const { notificationCalls, notifications } = installMockNotification();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
      },
    });

    await showDeviceNotification("Injection reminder", "Dose due soon.");

    expect(notificationCalls).toHaveBeenCalledWith("Injection reminder", {
      body: "Dose due soon.",
      icon: "/icon-192.png",
      tag: "inner-circle-injection-reminder",
    });
    expect(notifications).toEqual([{ title: "Injection reminder", body: "Dose due soon." }]);
  });

  it("uses a registered service worker when one is available", async () => {
    const { notificationCalls } = installMockNotification();
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({ showNotification }),
      },
    });

    await showDeviceNotification("Injection reminder", "Dose due soon.");

    expect(showNotification).toHaveBeenCalledWith("Injection reminder", {
      body: "Dose due soon.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "inner-circle-injection-reminder",
    });
    expect(notificationCalls).not.toHaveBeenCalled();
  });

  it("falls back to the Notification API when service worker notification fails", async () => {
    const { notificationCalls, notifications } = installMockNotification();
    const showNotification = vi.fn().mockRejectedValue(new Error("stale registration"));
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({ showNotification }),
      },
    });

    await showDeviceNotification("Injection reminder", "Dose due soon.");

    expect(showNotification).toHaveBeenCalledOnce();
    expect(notificationCalls).toHaveBeenCalledWith("Injection reminder", {
      body: "Dose due soon.",
      icon: "/icon-192.png",
      tag: "inner-circle-injection-reminder",
    });
    expect(notifications).toEqual([{ title: "Injection reminder", body: "Dose due soon." }]);
  });
});
