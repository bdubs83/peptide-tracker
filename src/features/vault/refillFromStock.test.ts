import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../db/db";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { StockItem } from "../../types/stock";
import { refillOpenVialFromStock } from "./refillFromStock";

afterEach(async () => {
  db.close();
  await indexedDB.deleteDatabase("PeptideVaultDatabase");
});

describe("refillOpenVialFromStock", () => {
  it("accepts a different strength after verified reconstitution and preserves the schedule", async () => {
    const timestamp = "2026-07-10T12:00:00.000Z";
    const peptide: Peptide = {
      id: "peptide-1",
      name: "Retatrutide",
      vialMg: 20,
      bacWaterMl: 2,
      desiredDoseValue: 2,
      desiredDoseUnit: "mg",
      syringeSizeMl: 1,
      unitsPerMl: 100,
      concentrationMgPerMl: 10,
      concentrationMcgPerMl: 10000,
      doseMl: 0.5,
      doseUnits: 50,
      estimatedDosesPerVial: 10,
      percentOfVialPerDose: 10,
      openVialId: "open-old",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const schedule: PeptideSchedule = {
      id: "schedule-1",
      peptideId: peptide.id,
      openVialId: "open-old",
      scheduleType: "everyXDays",
      intervalDays: 7,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const stockItem: StockItem = {
      id: "stock-30",
      name: "Retatrutide",
      mgPerVial: "30",
      purchasedVialCount: "2",
      numberOfVials: "2",
      supplier: "Vendor B",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.peptides.put(peptide);
    await db.schedules.put(schedule);
    await db.stockItems.put(stockItem);

    await refillOpenVialFromStock({
      peptide,
      stockItem,
      existingRemainingMg: 0,
      reconstitutionBacWaterMl: 2,
      today: "2026-07-10",
    });

    const updatedPeptide = await db.peptides.get(peptide.id);
    const updatedSchedule = await db.schedules.get(schedule.id);
    const updatedStock = await db.stockItems.get(stockItem.id);

    expect(updatedPeptide).toMatchObject({
      vialMg: 30,
      bacWaterMl: 2,
      concentrationMgPerMl: 15,
      concentrationMcgPerMl: 15000,
      doseMl: 0.5,
      doseUnits: 50,
      sourceStockItemId: stockItem.id,
    });
    expect(updatedPeptide?.openVialId).not.toBe("open-old");
    expect(updatedSchedule).toMatchObject({ intervalDays: 7, isActive: true });
    expect(updatedSchedule?.openVialId).toBe(updatedPeptide?.openVialId);
    expect(updatedStock?.purchasedVialCount).toBe("2");
    expect(updatedStock?.numberOfVials).toBe("1");
  });
});
