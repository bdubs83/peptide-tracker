import Dexie, { type Table } from "dexie";
import type { Peptide } from "../types/peptide";
import type { PeptideSchedule } from "../types/schedule";
import type { InjectionLog } from "../types/injectionLog";
import type { WeightLog } from "../types/weightLog";
import type { StockItem } from "../types/stock";
import type { VaultUser } from "../types/vaultUser";
import type { VialAdjustment } from "../types/vialAdjustment";
import { DEFAULT_VAULT_USER_ID } from "../types/vaultUser";
import type { AppSetting } from "./schema";
import { convertLegacyScheduleToDoseSchedule, scheduleNeedsDoseSchedule } from "../utils/scheduleMigration";

export class PeptideVaultDatabase extends Dexie {
  peptides!: Table<Peptide, string>;
  schedules!: Table<PeptideSchedule, string>;
  injectionLogs!: Table<InjectionLog, string>;
  weightLogs!: Table<WeightLog, string>;
  stockItems!: Table<StockItem, string>;
  vaultUsers!: Table<VaultUser, string>;
  vialAdjustments!: Table<VialAdjustment, string>;
  appSettings!: Table<AppSetting, string>;

  constructor() {
    super("PeptideVaultDatabase");
    this.version(1).stores({
      peptides: "id, name, createdAt",
      schedules: "id, peptideId, isActive",
      injectionLogs: "id, peptideId, scheduledDate, status",
      weightLogs: "id, date, createdAt",
      appSettings: "key",
    });
    this.version(2).stores({
      peptides: "id, name, createdAt",
      schedules: "id, peptideId, isActive",
      injectionLogs: "id, peptideId, scheduledDate, status",
      weightLogs: "id, date, createdAt",
      appSettings: "key",
      stockItems: "id, name, createdAt, receivedDate",
    });
    this.version(3)
      .stores({
        peptides: "id, name, createdAt",
        schedules: "id, peptideId, isActive",
        injectionLogs: "id, peptideId, scheduledDate, status",
        weightLogs: "id, date, createdAt",
        appSettings: "key",
        stockItems: "id, name, createdAt, receivedDate",
      })
      .upgrade(async (transaction) => {
        const schedules = await transaction.table<PeptideSchedule, string>("schedules").toArray();
        const peptides = transaction.table<Peptide, string>("peptides");
        const schedulesTable = transaction.table<PeptideSchedule, string>("schedules");

        for (const schedule of schedules) {
          if (!scheduleNeedsDoseSchedule(schedule)) continue;

          const peptide = await peptides.get(schedule.peptideId);
          if (!peptide) continue;

          const converted = convertLegacyScheduleToDoseSchedule(schedule, peptide);
          await schedulesTable.update(schedule.id, {
            doseSchedule: converted.doseSchedule,
            doseScheduleStartDate: converted.doseScheduleStartDate,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    this.version(4)
      .stores({
        peptides: "id, name, createdAt, vaultUserId, openVialId",
        schedules: "id, peptideId, isActive, vaultUserId, openVialId",
        injectionLogs: "id, peptideId, scheduledDate, status, vaultUserId, openVialId",
        weightLogs: "id, date, createdAt",
        appSettings: "key",
        stockItems: "id, name, createdAt, receivedDate",
        vaultUsers: "id, sortOrder",
      })
      .upgrade(async (transaction) => {
        const nowIso = new Date().toISOString();
        const vaultUsers = transaction.table<VaultUser, string>("vaultUsers");
        const peptides = transaction.table<Peptide, string>("peptides");
        const schedules = transaction.table<PeptideSchedule, string>("schedules");
        const injectionLogs = transaction.table<InjectionLog, string>("injectionLogs");

        if (!(await vaultUsers.get(DEFAULT_VAULT_USER_ID))) {
          await vaultUsers.put({
            id: DEFAULT_VAULT_USER_ID,
            displayName: "User 1",
            color: "#6366f1",
            sortOrder: 1,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }

        const peptideList = await peptides.toArray();
        for (const peptide of peptideList) {
          const openVialId = peptide.openVialId || peptide.id;
          await peptides.update(peptide.id, {
            vaultUserId: peptide.vaultUserId || DEFAULT_VAULT_USER_ID,
            openVialId,
            updatedAt: peptide.updatedAt || nowIso,
          });
        }

        const openVialByPeptideId = new Map(
          (await peptides.toArray()).map((peptide) => [peptide.id, peptide.openVialId || peptide.id])
        );

        for (const schedule of await schedules.toArray()) {
          await schedules.update(schedule.id, {
            vaultUserId: schedule.vaultUserId || DEFAULT_VAULT_USER_ID,
            openVialId: schedule.openVialId || openVialByPeptideId.get(schedule.peptideId) || schedule.peptideId,
            updatedAt: schedule.updatedAt || nowIso,
          });
        }

        for (const log of await injectionLogs.toArray()) {
          await injectionLogs.update(log.id, {
            vaultUserId: log.vaultUserId || DEFAULT_VAULT_USER_ID,
            openVialId: log.openVialId || openVialByPeptideId.get(log.peptideId) || log.peptideId,
            updatedAt: log.updatedAt || nowIso,
          });
        }
      });
    this.version(5)
      .stores({
        peptides: "id, name, createdAt, vaultUserId, openVialId",
        schedules: "id, peptideId, isActive, vaultUserId, openVialId",
        injectionLogs: "id, peptideId, scheduledDate, status, vaultUserId, openVialId",
        weightLogs: "id, date, createdAt",
        appSettings: "key",
        stockItems: "id, name, createdAt, receivedDate",
        vaultUsers: "id, sortOrder",
      })
      .upgrade(async (transaction) => {
        const nowIso = new Date().toISOString();
        const timestampedTables = [
          transaction.table<Peptide, string>("peptides"),
          transaction.table<PeptideSchedule, string>("schedules"),
          transaction.table<InjectionLog, string>("injectionLogs"),
          transaction.table<WeightLog, string>("weightLogs"),
          transaction.table<StockItem, string>("stockItems"),
          transaction.table<VaultUser, string>("vaultUsers"),
        ];

        for (const table of timestampedTables) {
          for (const record of await table.toArray()) {
            const createdAt = record.createdAt || record.updatedAt || nowIso;
            const updatedAt = record.updatedAt || record.createdAt || nowIso;
            if (record.createdAt && record.updatedAt) continue;

            await table.update(record.id, {
              createdAt,
              updatedAt,
            });
          }
        }

        const appSettings = transaction.table<AppSetting, string>("appSettings");
        for (const setting of await appSettings.toArray()) {
          if (setting.createdAt && setting.updatedAt) continue;

          await appSettings.update(setting.key, {
            createdAt: setting.createdAt || setting.updatedAt || nowIso,
            updatedAt: setting.updatedAt || setting.createdAt || nowIso,
          });
        }
      });
    this.version(6).stores({
      peptides: "id, name, createdAt, vaultUserId, openVialId",
      schedules: "id, peptideId, isActive, vaultUserId, openVialId",
      injectionLogs: "id, peptideId, scheduledDate, status, vaultUserId, openVialId",
      weightLogs: "id, date, createdAt",
      appSettings: "key",
      stockItems: "id, name, createdAt, receivedDate",
      vaultUsers: "id, sortOrder",
      vialAdjustments: "id, peptideId, adjustmentDate, reason, vaultUserId, openVialId",
    });
  }
}

export const db = new PeptideVaultDatabase();
