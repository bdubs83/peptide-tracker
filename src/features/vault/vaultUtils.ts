import { db } from "../../db/db";
import { isActiveRecord } from "../../db/activeRecords";
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
  const nowIso = new Date().toISOString();
  await db.transaction("rw", [db.peptides, db.schedules], async () => {
    await db.peptides.update(peptideId, {
      deletedAt: nowIso,
      updatedAt: nowIso,
    });
    const schedules = await db.schedules.where("peptideId").equals(peptideId).toArray();
    for (const schedule of schedules) {
      await db.schedules.update(schedule.id, {
        deletedAt: nowIso,
        updatedAt: nowIso,
      });
    }
  });
}

export async function logInjectionEvent(log: InjectionLog): Promise<void> {
  // A standalone injection is an independent event. In particular, it may be
  // recorded on the same day as a planned dose from the same vial.
  if (log.entryType === "adHoc") {
    await db.injectionLogs.put(log);
    return;
  }

  const openVialId = log.openVialId || log.peptideId;
  const matchingLogs = await db.injectionLogs
    .where("peptideId")
    .equals(log.peptideId)
    .filter(isActiveRecord)
    .filter((existingLog) => {
      const existingOpenVialId = existingLog.openVialId || existingLog.peptideId;
      return (
        existingLog.entryType !== "adHoc" &&
        existingLog.scheduledDate === log.scheduledDate &&
        existingOpenVialId === openVialId
      );
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
  const nowIso = new Date().toISOString();
  await db.injectionLogs.update(logId, {
    deletedAt: nowIso,
    updatedAt: nowIso,
  });
}

export async function updateInjectionLog(
  logId: string,
  updates: Partial<Omit<InjectionLog, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await db.injectionLogs.update(logId, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}
