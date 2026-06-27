import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../db/db";
import { firestoreDb } from "./firebase";
import type { Peptide } from "../types/peptide";
import type { PeptideSchedule } from "../types/schedule";
import type { InjectionLog } from "../types/injectionLog";
import type { WeightLog } from "../types/weightLog";
import type { StockItem } from "../types/stock";
import type { VaultUser } from "../types/vaultUser";
import type { AppSetting } from "../db/schema";

type SyncCollectionName =
  | "peptides"
  | "schedules"
  | "injectionLogs"
  | "weightLogs"
  | "stockItems"
  | "vaultUsers"
  | "appSettings";

type SyncRecord =
  | Peptide
  | PeptideSchedule
  | InjectionLog
  | WeightLog
  | StockItem
  | VaultUser
  | AppSetting;
type CloudRecord = SyncRecord & { syncedAt?: string };

export type CloudDataCounts = Record<SyncCollectionName, number>;
export type CloudRecordDifference = {
  id: string;
  label: string;
};
export type CloudCollectionComparison = {
  collectionName: SyncCollectionName;
  localCount: number;
  cloudCount: number;
  localOnly: CloudRecordDifference[];
  cloudOnly: CloudRecordDifference[];
};

const collectionNames: SyncCollectionName[] = [
  "peptides",
  "schedules",
  "injectionLogs",
  "weightLogs",
  "stockItems",
  "vaultUsers",
  "appSettings",
];

const getRecordId = (collectionName: SyncCollectionName, record: SyncRecord) => {
  return collectionName === "appSettings" ? (record as AppSetting).key : (record as { id: string }).id;
};

const removeUndefinedFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(removeUndefinedFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, removeUndefinedFields(entryValue)])
  );
};

const removeSyncMetadata = (data: CloudRecord) => {
  const record = { ...data };
  delete record.syncedAt;
  return record as SyncRecord;
};

const getLocalRecords = async (collectionName: SyncCollectionName): Promise<SyncRecord[]> => {
  if (collectionName === "peptides") return db.peptides.toArray();
  if (collectionName === "schedules") return db.schedules.toArray();
  if (collectionName === "injectionLogs") return db.injectionLogs.toArray();
  if (collectionName === "weightLogs") return db.weightLogs.toArray();
  if (collectionName === "stockItems") return db.stockItems.toArray();
  if (collectionName === "vaultUsers") return db.vaultUsers.toArray();
  return db.appSettings.toArray();
};

const getCloudRecords = async (user: User, collectionName: SyncCollectionName): Promise<SyncRecord[]> => {
  const snapshot = await getDocs(userCollection(user, collectionName));
  return snapshot.docs.map((item) => removeSyncMetadata(item.data() as CloudRecord));
};

const putLocalRecords = async (collectionName: SyncCollectionName, records: SyncRecord[]) => {
  if (collectionName === "peptides") await db.peptides.bulkPut(records as Peptide[]);
  if (collectionName === "schedules") await db.schedules.bulkPut(records as PeptideSchedule[]);
  if (collectionName === "injectionLogs") await db.injectionLogs.bulkPut(records as InjectionLog[]);
  if (collectionName === "weightLogs") await db.weightLogs.bulkPut(records as WeightLog[]);
  if (collectionName === "stockItems") await db.stockItems.bulkPut(records as StockItem[]);
  if (collectionName === "vaultUsers") await db.vaultUsers.bulkPut(records as VaultUser[]);
  if (collectionName === "appSettings") await db.appSettings.bulkPut(records as AppSetting[]);
};

const clearLocalCollection = async (collectionName: SyncCollectionName) => {
  if (collectionName === "peptides") await db.peptides.clear();
  if (collectionName === "schedules") await db.schedules.clear();
  if (collectionName === "injectionLogs") await db.injectionLogs.clear();
  if (collectionName === "weightLogs") await db.weightLogs.clear();
  if (collectionName === "stockItems") await db.stockItems.clear();
  if (collectionName === "vaultUsers") await db.vaultUsers.clear();
  if (collectionName === "appSettings") await db.appSettings.clear();
};

const clearCloudCollection = async (user: User, collectionName: SyncCollectionName) => {
  const snapshot = await getDocs(userCollection(user, collectionName));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
};

const getRecordLabel = (collectionName: SyncCollectionName, record: SyncRecord) => {
  if (collectionName === "peptides") return (record as Peptide).name || getRecordId(collectionName, record);
  if (collectionName === "schedules") {
    const schedule = record as PeptideSchedule;
    return `${schedule.peptideId} schedule`;
  }
  if (collectionName === "injectionLogs") {
    const log = record as InjectionLog;
    return `${log.peptideNameSnapshot || log.peptideId} on ${log.scheduledDate}`;
  }
  if (collectionName === "weightLogs") {
    const log = record as WeightLog;
    return `${log.date}${log.weight ? ` - ${log.weight}` : ""}`;
  }
  if (collectionName === "stockItems") return (record as StockItem).name || getRecordId(collectionName, record);
  if (collectionName === "vaultUsers") return (record as VaultUser).displayName || getRecordId(collectionName, record);
  return (record as AppSetting).key;
};

const userDoc = (user: User) => doc(firestoreDb, "users", user.uid);
const userCollection = (user: User, collectionName: SyncCollectionName) =>
  collection(firestoreDb, "users", user.uid, collectionName);

export async function getLocalDataCounts(): Promise<CloudDataCounts> {
  return {
    peptides: await db.peptides.count(),
    schedules: await db.schedules.count(),
    injectionLogs: await db.injectionLogs.count(),
    weightLogs: await db.weightLogs.count(),
    stockItems: await db.stockItems.count(),
    vaultUsers: await db.vaultUsers.count(),
    appSettings: await db.appSettings.count(),
  };
}

export async function getCloudDataCounts(user: User): Promise<CloudDataCounts> {
  const counts = {} as CloudDataCounts;
  for (const collectionName of collectionNames) {
    counts[collectionName] = (await getDocs(userCollection(user, collectionName))).size;
  }
  return counts;
}

export async function compareLocalAndCloudData(user: User): Promise<CloudCollectionComparison[]> {
  const comparison: CloudCollectionComparison[] = [];

  for (const collectionName of collectionNames) {
    const localRecords = await getLocalRecords(collectionName);
    const cloudRecords = await getCloudRecords(user, collectionName);
    const localById = new Map(localRecords.map((record) => [getRecordId(collectionName, record), record]));
    const cloudById = new Map(cloudRecords.map((record) => [getRecordId(collectionName, record), record]));

    comparison.push({
      collectionName,
      localCount: localRecords.length,
      cloudCount: cloudRecords.length,
      localOnly: localRecords
        .filter((record) => !cloudById.has(getRecordId(collectionName, record)))
        .map((record) => ({
          id: getRecordId(collectionName, record),
          label: getRecordLabel(collectionName, record),
        })),
      cloudOnly: cloudRecords
        .filter((record) => !localById.has(getRecordId(collectionName, record)))
        .map((record) => ({
          id: getRecordId(collectionName, record),
          label: getRecordLabel(collectionName, record),
        })),
    });
  }

  return comparison;
}

export async function uploadLocalDataToCloud(user: User): Promise<void> {
  await setDoc(
    userDoc(user),
    {
      email: user.email || "",
      displayName: user.displayName || "",
      lastCloudBackupAt: serverTimestamp(),
      schemaVersion: 1,
    },
    { merge: true }
  );

  for (const collectionName of collectionNames) {
    await clearCloudCollection(user, collectionName);
    const records = await getLocalRecords(collectionName);
    for (const record of records) {
      await setDoc(doc(firestoreDb, "users", user.uid, collectionName, getRecordId(collectionName, record)), removeUndefinedFields({
        ...record,
        syncedAt: new Date().toISOString(),
      }) as Record<string, unknown>);
    }
  }

  await db.appSettings.put({ key: "lastCloudBackupAt", value: new Date().toISOString() });
}

export async function restoreCloudDataToLocal(user: User): Promise<void> {
  const cloudData = new Map<SyncCollectionName, SyncRecord[]>();

  for (const collectionName of collectionNames) {
    const snapshot = await getDocs(userCollection(user, collectionName));
    cloudData.set(
      collectionName,
      snapshot.docs.map((item) => {
        return removeSyncMetadata(item.data() as CloudRecord);
      })
    );
  }

  await db.transaction(
    "rw",
    [db.peptides, db.schedules, db.injectionLogs, db.weightLogs, db.stockItems, db.vaultUsers, db.appSettings],
    async () => {
      for (const collectionName of collectionNames) {
        await clearLocalCollection(collectionName);
        await putLocalRecords(collectionName, cloudData.get(collectionName) || []);
      }
      await db.appSettings.put({ key: "lastCloudRestoreAt", value: new Date().toISOString() });
    }
  );
}

export async function mergeCloudDataIntoLocal(user: User): Promise<void> {
  for (const collectionName of collectionNames) {
    const snapshot = await getDocs(userCollection(user, collectionName));
    const records = snapshot.docs.map((item) => {
      return removeSyncMetadata(item.data() as CloudRecord);
    });
    await putLocalRecords(collectionName, records);
  }
  await db.appSettings.put({ key: "lastCloudMergeAt", value: new Date().toISOString() });
}

export async function hasCloudProfile(user: User): Promise<boolean> {
  const profile = await getDoc(userDoc(user));
  return profile.exists();
}
