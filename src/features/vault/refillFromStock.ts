import { db } from "../../db/db";
import { activeRecords } from "../../db/activeRecords";
import type { Peptide } from "../../types/peptide";
import type { StockItem } from "../../types/stock";
import { isAvailableStock } from "../../utils/stockUtils";

type RefillFromStockInput = {
  peptide: Peptide;
  stockItem: StockItem;
  existingRemainingMg: number;
  reconstitutionBacWaterMl: number;
  today: string;
};

export async function refillOpenVialFromStock({
  peptide,
  stockItem,
  existingRemainingMg,
  reconstitutionBacWaterMl,
  today,
}: RefillFromStockInput) {
  if (!isAvailableStock(stockItem, today)) {
    throw new Error("This stock item is not available to pull yet.");
  }

  const mgPerVial = stockItem.mgPerVial ? Number(stockItem.mgPerVial) : NaN;
  const vialCount = stockItem.numberOfVials ? Number(stockItem.numberOfVials) : NaN;
  if (!Number.isFinite(mgPerVial) || mgPerVial <= 0 || !Number.isFinite(vialCount) || vialCount <= 0) {
    throw new Error("This stock item does not have an available vial to pull.");
  }
  if (!Number.isFinite(reconstitutionBacWaterMl) || reconstitutionBacWaterMl <= 0) {
    throw new Error(peptide.isOilBased ? "Enter the prefilled oil volume for this vial." : "Enter the bacteriostatic-water amount used to reconstitute this vial.");
  }

  const nowIso = new Date().toISOString();
  const newOpenVialId = crypto.randomUUID();
  const currentVialTotalMg = Math.max(0, existingRemainingMg) + mgPerVial;
  const concentrationMgPerMl = mgPerVial / reconstitutionBacWaterMl;
  const concentrationMcgPerMl = concentrationMgPerMl * 1000;

  const oldOpenVialId = peptide.openVialId || peptide.id;

  await db.transaction("rw", [db.peptides, db.schedules, db.stockItems], async () => {
    const sharedPeptides = activeRecords(await db.peptides.where("openVialId").equals(oldOpenVialId).toArray());
    if (!sharedPeptides.some((sharedPeptide) => sharedPeptide.id === peptide.id)) {
      sharedPeptides.push(peptide);
    }
    const sharedPeptideIds = new Set(sharedPeptides.map((sharedPeptide) => sharedPeptide.id));

    for (const sharedPeptide of sharedPeptides) {
      await db.peptides.update(sharedPeptide.id, {
        vialMg: mgPerVial,
        bacWaterMl: peptide.isOilBased ? 0 : reconstitutionBacWaterMl,
        oilVolumeMl: peptide.isOilBased ? reconstitutionBacWaterMl : undefined,
        concentrationMgPerMl,
        concentrationMcgPerMl,
        currentVialStartedAt: nowIso,
        currentVialTotalMg,
        openVialId: newOpenVialId,
        efficacyVerifiedAt: undefined,
        sourceStockItemId: stockItem.id,
        updatedAt: nowIso,
      });
    }

    const linkedSchedules = activeRecords(await db.schedules.where("openVialId").equals(oldOpenVialId).toArray());
    for (const schedule of linkedSchedules) {
      await db.schedules.update(schedule.id, {
        openVialId: newOpenVialId,
        updatedAt: nowIso,
      });
    }

    const legacyScheduleRows = activeRecords(await db.schedules.toArray()).filter(
      (schedule) => sharedPeptideIds.has(schedule.peptideId) && !schedule.openVialId
    );
    for (const schedule of legacyScheduleRows) {
      await db.schedules.update(schedule.id, {
        openVialId: newOpenVialId,
        updatedAt: nowIso,
      });
    }

    await db.stockItems.update(stockItem.id, {
      numberOfVials: String(Math.max(0, Math.floor(vialCount) - 1)),
      updatedAt: nowIso,
    });
  });
}
