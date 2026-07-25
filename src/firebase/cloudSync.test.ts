import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InjectionLog } from "../types/injectionLog";
import type { HealthLog } from "../types/healthLog";

const loadCloudSyncModule = async () => {
  vi.resetModules();
  return import("./cloudSync");
};

afterEach(async () => {
  const { db } = await import("../db/db");
  db.close();
  await indexedDB.deleteDatabase("PeptideVaultDatabase");
});

describe("cloud sync", () => {
  it("does not count scheduled placeholders as syncable injection logs", async () => {
    const { getLocalDataCounts } = await loadCloudSyncModule();
    const { db } = await import("../db/db");
    const now = "2026-06-29T12:00:00.000Z";
    const baseLog = {
      peptideId: "p1",
      peptideNameSnapshot: "KLOW",
      doseValue: 1,
      doseUnit: "mg",
      drawMl: 0.1,
      drawUnits: 10,
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<InjectionLog, "id" | "scheduledDate" | "status">;

    await db.injectionLogs.bulkPut([
      {
        ...baseLog,
        id: "future-placeholder",
        scheduledDate: "2027-02-04",
        status: "scheduled",
      },
      {
        ...baseLog,
        id: "completed-injection",
        scheduledDate: "2026-06-28",
        actualDateTime: now,
        status: "taken",
      },
    ]);

    await expect(db.injectionLogs.count()).resolves.toBe(2);
    await expect(getLocalDataCounts()).resolves.toMatchObject({
      injectionLogs: 1,
    });
  });

  it("does not count the local auto sync toggle as a syncable setting", async () => {
    const { autoSyncEnabledKey, getLocalDataCounts } = await loadCloudSyncModule();
    const { putAppSetting } = await import("../db/appSettings");
    const { db } = await import("../db/db");

    await putAppSetting(autoSyncEnabledKey, true);
    await putAppSetting("pref_timezone", "America/New_York");

    await expect(db.appSettings.count()).resolves.toBe(2);
    await expect(getLocalDataCounts()).resolves.toMatchObject({
      appSettings: 1,
    });
  });

  it("includes stored Health Tracker summaries in cloud-sync counts", async () => {
    const { getLocalDataCounts } = await loadCloudSyncModule();
    const { db } = await import("../db/db");
    const now = "2026-07-13T12:00:00.000Z";
    const dailySteps: HealthLog = {
      id: "healthconnect:steps:daily:2026-07-13:steps",
      metric: "steps",
      startTime: now,
      value: 5432,
      unit: "count",
      source: "healthConnect",
      sourceRecordId: "daily:2026-07-13:steps",
      createdAt: now,
      updatedAt: now,
    };

    await db.healthLogs.add(dailySteps);

    await expect(getLocalDataCounts()).resolves.toMatchObject({ healthLogs: 1 });
  });

  it("does not treat matching records with different key order as a conflict", async () => {
    const { __cloudSyncTest } = await loadCloudSyncModule();
    const updatedAt = "2026-06-29T12:00:00.000Z";
    const left = {
      id: "p1",
      name: "KLOW",
      createdAt: updatedAt,
      updatedAt,
      optional: undefined,
      nested: {
        dose: 1,
        unit: "mg",
      },
    };
    const right = {
      nested: {
        unit: "mg",
        dose: 1,
      },
      updatedAt,
      createdAt: updatedAt,
      name: "KLOW",
      id: "p1",
    };

    expect(__cloudSyncTest.recordsDiffer(left, right)).toBe(false);
  });

  it("compares equivalent ISO timestamps by time instead of string shape", async () => {
    const { __cloudSyncTest } = await loadCloudSyncModule();
    const withMilliseconds = {
      key: "pref_timezone",
      value: "America/New_York",
      updatedAt: "2026-06-29T12:00:00.000Z",
    };
    const withoutMilliseconds = {
      key: "pref_timezone",
      value: "America/New_York",
      updatedAt: "2026-06-29T12:00:00Z",
    };

    expect(__cloudSyncTest.getRecordUpdatedAtMs(withMilliseconds)).toBe(
      __cloudSyncTest.getRecordUpdatedAtMs(withoutMilliseconds)
    );
  });

  it("rejects oversized records before they are sent to Firestore", async () => {
    const { __cloudSyncTest } = await loadCloudSyncModule();
    const now = "2026-06-29T12:00:00.000Z";

    expect(() =>
      __cloudSyncTest.assertCloudRecordFits("stockItems", {
        id: "stock-too-large",
        name: "Oversized COA",
        coaDataUrl: `data:application/pdf;base64,${"A".repeat(910 * 1024)}`,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow(/too large to sync safely/i);
  });
});
