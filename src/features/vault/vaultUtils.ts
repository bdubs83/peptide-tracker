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
  await db.injectionLogs.put(log);
}

export async function deleteInjectionLog(logId: string): Promise<void> {
  await db.injectionLogs.delete(logId);
}
