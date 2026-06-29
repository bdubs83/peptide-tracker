import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InjectionLog } from "../types/injectionLog";

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
});
