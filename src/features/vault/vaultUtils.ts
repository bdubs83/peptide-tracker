import { db } from "../../db/db";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { InjectionLog } from "../../types/injectionLog";

export async function savePeptideWithSchedule(
  peptide: Peptide,
  schedule: PeptideSchedule
): Promise<void> {
  await db.transaction("rw", [db.peptides, db.schedules], async () => {
    await db.peptides.put(peptide);
    await db.schedules.put(schedule);
  });
}

export async function deletePeptideWithSchedule(peptideId: string): Promise<void> {
  await db.transaction("rw", [db.peptides, db.schedules], async () => {
    await db.peptides.delete(peptideId);
    await db.schedules.where("peptideId").equals(peptideId).delete();
  });
}

export async function logInjectionEvent(log: InjectionLog): Promise<void> {
  const openVialId = log.openVialId || log.peptideId;
  const matchingLogs = await db.injectionLogs
    .where("peptideId")
    .equals(log.peptideId)
    .filter((existingLog) => {
      const existingOpenVialId = existingLog.openVialId || existingLog.peptideId;
      return existingLog.scheduledDate === log.scheduledDate && existingOpenVialId === openVialId;
    })
    .toArray();

  const existingLog =
    matchingLogs.find((candidate) => candidate.status === "scheduled") ||
    matchingLogs.find((candidate) => candidate.status !== "scheduled");

  if (!existingLog) {
    await db.injectionLogs.put(log);
    return;
  }

  await db.injectionLogs.update(existingLog.id, {
    vaultUserId: log.vaultUserId,
    openVialId: log.openVialId,
    peptideNameSnapshot: log.peptideNameSnapshot,
    scheduledDate: log.scheduledDate,
    actualDateTime: log.actualDateTime,
    doseValue: log.doseValue,
    doseUnit: log.doseUnit,
    drawMl: log.drawMl,
    drawUnits: log.drawUnits,
    status: log.status,
    injectionSiteId: log.injectionSiteId,
    injectionSiteLabel: log.injectionSiteLabel,
    injectionSiteSide: log.injectionSiteSide,
    notes: log.notes,
    updatedAt: log.updatedAt,
  });
}

export async function deleteInjectionLog(logId: string): Promise<void> {
  await db.injectionLogs.delete(logId);
}
