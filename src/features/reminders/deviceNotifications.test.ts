import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  createChannel: vi.fn(),
  getPending: vi.fn(),
  schedule: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => "android",
    isNativePlatform: () => true,
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: notificationMocks,
}));

import { replaceNativeReminderSchedule } from "./deviceNotifications";

describe("native reminder scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationMocks.checkPermissions.mockResolvedValue({ display: "granted" });
    notificationMocks.createChannel.mockResolvedValue(undefined);
    notificationMocks.getPending.mockResolvedValue({
      notifications: [
        { id: 5, title: "Old", body: "Old", extra: { source: "inner-circle-scheduled-reminder" } },
        { id: 6, title: "Other", body: "Other", extra: { source: "another-feature" } },
      ],
    });
    notificationMocks.cancel.mockResolvedValue(undefined);
    notificationMocks.schedule.mockResolvedValue({ notifications: [] });
  });

  it("replaces owned reminders with future native schedules", async () => {
    const at = new Date(Date.now() + 60 * 60 * 1000);

    await replaceNativeReminderSchedule([
      {
        key: "peptide-1:2026-07-11:30min",
        title: "Injection reminder",
        body: "Dose due soon.",
        at,
      },
    ]);

    expect(notificationMocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 5 }] });
    expect(notificationMocks.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({
          id: expect.any(Number),
          title: "Injection reminder",
          body: "Dose due soon.",
          schedule: { at, allowWhileIdle: true },
          extra: expect.objectContaining({ source: "inner-circle-scheduled-reminder" }),
        }),
      ],
    });
  });
});
