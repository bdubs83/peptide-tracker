import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../db/db";
import { putAppSetting } from "../db/appSettings";
import { firestoreDb } from "./firebase";
import type { Peptide } from "../types/peptide";
import type { PeptideSchedule } from "../types/schedule";
import type { InjectionLog } from "../types/injectionLog";
import type { WeightLog } from "../types/weightLog";
import type { StockItem } from "../types/stock";
import type { VaultUser } from "../types/vaultUser";
import type { AppSetting } from "../db/schema";

export type SyncCollectionName =
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
export type AutoSyncResult = {
  uploaded: number;
  downloaded: number;
  conflicts: number;
};
export type AutoSyncConflict = {
  collectionName: SyncCollectionName;
  id: string;
  label: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  localRecord: SyncRecord;
  cloudRecord: SyncRecord;
};

export const autoSyncEnabledKey = "autoSyncEnabled";
export const lastAutoSyncAtKey = "lastAutoSyncAt";
export const lastAutoSyncErrorKey = "lastAutoSyncError";
export const lastAutoSyncConflictsKey = "lastAutoSyncConflicts";
export const lastAutoSyncResultKey = "lastAutoSyncResult";
export const lastAutoSyncStatusKey = "lastAutoSyncStatus";
export const lastKnownCloudReplaceAtKey = "lastKnownCloudReplaceAt";
export const cloudReplaceAtKey = "cloudReplaceAt";
const localOnlyAppSettingKeys = new Set([
  autoSyncEnabledKey,
  lastAutoSyncAtKey,
  lastAutoSyncErrorKey,
  lastAutoSyncConflictsKey,
  lastAutoSyncResultKey,
  lastAutoSyncStatusKey,
  lastKnownCloudReplaceAtKey,
]);

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

const shouldSyncRecord = (collectionName: SyncCollectionName, record: SyncRecord) => {
  if (collectionName === "injectionLogs") return (record as InjectionLog).status !== "scheduled";
  if (collectionName === "appSettings") return !localOnlyAppSettingKeys.has((record as AppSetting).key);
  return true;
};

const getSyncableRecords = (collectionName: SyncCollectionName, records: SyncRecord[]) =>
  records.filter((record) => shouldSyncRecord(collectionName, record));

const withSyncTimestamps = <T extends SyncRecord>(records: T[]) => {
  const nowIso = new Date().toISOString();
  return records.map((record) => ({
    ...record,
    createdAt: "createdAt" in record && typeof record.createdAt === "string" ? record.createdAt : nowIso,
    updatedAt: "updatedAt" in record && typeof record.updatedAt === "string" ? record.updatedAt : nowIso,
  }));
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
  return getSyncableRecords(
    collectionName,
    snapshot.docs.map((item) => removeSyncMetadata(item.data() as CloudRecord))
  );
};

const normalizeForComparison = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeForComparison);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => [key, normalizeForComparison(entryValue)])
  );
};

const writeCloudRecord = async (user: User, collectionName: SyncCollectionName, record: SyncRecord) => {
  await setDoc(
    doc(firestoreDb, "users", user.uid, collectionName, getRecordId(collectionName, record)),
    removeUndefinedFields({
      ...record,
      syncedAt: new Date().toISOString(),
    }) as Record<string, unknown>
  );
};

const putLocalRecords = async (collectionName: SyncCollectionName, records: SyncRecord[]) => {
  const timestampedRecords = withSyncTimestamps(records);
  if (collectionName === "peptides") await db.peptides.bulkPut(timestampedRecords as Peptide[]);
  if (collectionName === "schedules") await db.schedules.bulkPut(timestampedRecords as PeptideSchedule[]);
  if (collectionName === "injectionLogs") await db.injectionLogs.bulkPut(timestampedRecords as InjectionLog[]);
  if (collectionName === "weightLogs") await db.weightLogs.bulkPut(timestampedRecords as WeightLog[]);
  if (collectionName === "stockItems") await db.stockItems.bulkPut(timestampedRecords as StockItem[]);
  if (collectionName === "vaultUsers") await db.vaultUsers.bulkPut(timestampedRecords as VaultUser[]);
  if (collectionName === "appSettings") await db.appSettings.bulkPut(timestampedRecords as AppSetting[]);
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
    injectionLogs: await db.injectionLogs.where("status").notEqual("scheduled").count(),
    weightLogs: await db.weightLogs.count(),
    stockItems: await db.stockItems.count(),
    vaultUsers: await db.vaultUsers.count(),
    appSettings: getSyncableRecords("appSettings", await db.appSettings.toArray()).length,
  };
}

export async function getCloudDataCounts(user: User): Promise<CloudDataCounts> {
  const counts = {} as CloudDataCounts;
  for (const collectionName of collectionNames) {
    counts[collectionName] = (await getCloudRecords(user, collectionName)).length;
  }
  return counts;
}

export async function compareLocalAndCloudData(user: User): Promise<CloudCollectionComparison[]> {
  const comparison: CloudCollectionComparison[] = [];

  for (const collectionName of collectionNames) {
    const localRecords = getSyncableRecords(collectionName, await getLocalRecords(collectionName));
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

const getRecordUpdatedAt = (record: SyncRecord) => {
  if ("updatedAt" in record && typeof record.updatedAt === "string") return record.updatedAt;
  if ("createdAt" in record && typeof record.createdAt === "string") return record.createdAt;
  return "";
};

const getRecordUpdatedAtMs = (record: SyncRecord) => {
  const updatedAt = getRecordUpdatedAt(record);
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

const recordsDiffer = (left: SyncRecord, right: SyncRecord) => {
  return JSON.stringify(normalizeForComparison(left)) !== JSON.stringify(normalizeForComparison(right));
};

const getProfileCloudReplaceAt = (value: unknown) => {
  if (!value || typeof value !== "object") return "";
  const cloudReplaceAt = (value as Record<string, unknown>)[cloudReplaceAtKey];
  return typeof cloudReplaceAt === "string" ? cloudReplaceAt : "";
};

const getLastKnownCloudReplaceAt = async () => {
  const row = await db.appSettings.get(lastKnownCloudReplaceAtKey);
  return typeof row?.value === "string" ? row.value : "";
};

const getLocalOnlyAppSettings = async () => {
  const settings = await db.appSettings.toArray();
  return settings.filter((setting) => localOnlyAppSettingKeys.has(setting.key));
};

const serializeConflicts = (conflicts: AutoSyncConflict[]) => JSON.stringify(conflicts);

export const parseAutoSyncConflicts = (value: unknown): AutoSyncConflict[] => {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is AutoSyncConflict => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<AutoSyncConflict>;
      return (
        typeof candidate.collectionName === "string" &&
        collectionNames.includes(candidate.collectionName as SyncCollectionName) &&
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        Boolean(candidate.localRecord) &&
        Boolean(candidate.cloudRecord)
      );
    });
  } catch {
    return [];
  }
};

export async function runAutoSync(user: User): Promise<AutoSyncResult> {
  const result: AutoSyncResult = {
    uploaded: 0,
    downloaded: 0,
    conflicts: 0,
  };
  const conflicts: AutoSyncConflict[] = [];

  const profile = await getDoc(userDoc(user));
  if (profile.exists() && profile.data().uploadStatus === "inProgress") {
    throw new Error("The account copy has an unfinished upload. Finish or repair that before Auto Sync runs.");
  }

  const cloudReplaceAt = profile.exists() ? getProfileCloudReplaceAt(profile.data()) : "";
  const lastKnownCloudReplaceAt = await getLastKnownCloudReplaceAt();
  if (cloudReplaceAt && cloudReplaceAt !== lastKnownCloudReplaceAt) {
    await restoreCloudDataToLocal(user);
    await putAppSetting(lastAutoSyncAtKey, new Date().toISOString());
    await putAppSetting(lastAutoSyncConflictsKey, serializeConflicts([]));
    return result;
  }

  for (const collectionName of collectionNames) {
    const localRecords = getSyncableRecords(collectionName, await getLocalRecords(collectionName));
    const cloudRecords = await getCloudRecords(user, collectionName);
    const localById = new Map(localRecords.map((record) => [getRecordId(collectionName, record), record]));
    const cloudById = new Map(cloudRecords.map((record) => [getRecordId(collectionName, record), record]));
    const recordIds = new Set([...localById.keys(), ...cloudById.keys()]);
    const recordsToPutLocal: SyncRecord[] = [];

    for (const recordId of recordIds) {
      const localRecord = localById.get(recordId);
      const cloudRecord = cloudById.get(recordId);

      if (localRecord && !cloudRecord) {
        await writeCloudRecord(user, collectionName, localRecord);
        result.uploaded += 1;
        continue;
      }

      if (!localRecord && cloudRecord) {
        recordsToPutLocal.push(cloudRecord);
        result.downloaded += 1;
        continue;
      }

      if (!localRecord || !cloudRecord || !recordsDiffer(localRecord, cloudRecord)) continue;

      const localUpdatedAt = getRecordUpdatedAt(localRecord);
      const cloudUpdatedAt = getRecordUpdatedAt(cloudRecord);
      const localUpdatedAtMs = getRecordUpdatedAtMs(localRecord);
      const cloudUpdatedAtMs = getRecordUpdatedAtMs(cloudRecord);

      if (localUpdatedAtMs > cloudUpdatedAtMs) {
        await writeCloudRecord(user, collectionName, localRecord);
        result.uploaded += 1;
      } else if (cloudUpdatedAtMs > localUpdatedAtMs) {
        recordsToPutLocal.push(cloudRecord);
        result.downloaded += 1;
      } else {
        result.conflicts += 1;
        conflicts.push({
          collectionName,
          id: recordId,
          label: getRecordLabel(collectionName, localRecord),
          localUpdatedAt,
          cloudUpdatedAt,
          localRecord,
          cloudRecord,
        });
      }
    }

    if (recordsToPutLocal.length > 0) {
      await putLocalRecords(collectionName, recordsToPutLocal);
    }
  }

  await putAppSetting(lastAutoSyncAtKey, new Date().toISOString());
  await putAppSetting(lastAutoSyncConflictsKey, serializeConflicts(conflicts));
  return result;
}

export async function resolveAutoSyncConflict(
  user: User,
  conflict: AutoSyncConflict,
  winner: "local" | "cloud"
): Promise<void> {
  const record = winner === "local" ? conflict.localRecord : conflict.cloudRecord;

  if (winner === "local") {
    await writeCloudRecord(user, conflict.collectionName, record);
  } else {
    await putLocalRecords(conflict.collectionName, [record]);
  }

  const existingConflictsRow = await db.appSettings.get(lastAutoSyncConflictsKey);
  const remainingConflicts = parseAutoSyncConflicts(existingConflictsRow?.value).filter(
    (item) => !(item.collectionName === conflict.collectionName && item.id === conflict.id)
  );
  await putAppSetting(lastAutoSyncConflictsKey, serializeConflicts(remainingConflicts));
  await putAppSetting(lastAutoSyncStatusKey, remainingConflicts.length > 0 ? "needsReview" : "idle");
}

export function subscribeToCloudSyncChanges(
  user: User,
  onChange: () => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const unsubscribers = collectionNames.map((collectionName) =>
    onSnapshot(
      userCollection(user, collectionName),
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        onChange();
      },
      (error) => {
        onError?.(error);
      }
    )
  );

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function uploadLocalDataToCloud(user: User): Promise<void> {
  const uploadStartedAt = new Date().toISOString();
  await setDoc(
    userDoc(user),
    {
      email: user.email || "",
      displayName: user.displayName || "",
      uploadStatus: "inProgress",
      uploadStartedAt,
      [cloudReplaceAtKey]: uploadStartedAt,
      schemaVersion: 1,
    },
    { merge: true }
  );

  for (const collectionName of collectionNames) {
    await clearCloudCollection(user, collectionName);
    const records = getSyncableRecords(collectionName, await getLocalRecords(collectionName));
    for (const record of records) {
      await writeCloudRecord(user, collectionName, record);
    }
  }

  await setDoc(
    userDoc(user),
    {
      email: user.email || "",
      displayName: user.displayName || "",
      uploadStatus: "completed",
      uploadStartedAt,
      [cloudReplaceAtKey]: uploadStartedAt,
      lastCloudBackupAt: serverTimestamp(),
      schemaVersion: 1,
    },
    { merge: true }
  );

  await putAppSetting("lastCloudBackupAt", new Date().toISOString());
  await putAppSetting(lastKnownCloudReplaceAtKey, uploadStartedAt);
}

export async function restoreCloudDataToLocal(user: User): Promise<void> {
  const profile = await getDoc(userDoc(user));
  if (profile.exists() && profile.data().uploadStatus === "inProgress") {
    throw new Error("The account copy has an unfinished upload. Upload a clean device copy before restoring.");
  }

  const cloudReplaceAt = profile.exists() ? getProfileCloudReplaceAt(profile.data()) : "";
  const localOnlySettings = await getLocalOnlyAppSettings();
  const cloudData = new Map<SyncCollectionName, SyncRecord[]>();

  for (const collectionName of collectionNames) {
    cloudData.set(collectionName, await getCloudRecords(user, collectionName));
  }

  await db.transaction(
    "rw",
    [db.peptides, db.schedules, db.injectionLogs, db.weightLogs, db.stockItems, db.vaultUsers, db.appSettings],
    async () => {
      for (const collectionName of collectionNames) {
        await clearLocalCollection(collectionName);
        await putLocalRecords(collectionName, cloudData.get(collectionName) || []);
      }
      if (localOnlySettings.length > 0) {
        await db.appSettings.bulkPut(localOnlySettings);
      }
      await putAppSetting("lastCloudRestoreAt", new Date().toISOString());
      if (cloudReplaceAt) {
        await putAppSetting(lastKnownCloudReplaceAtKey, cloudReplaceAt);
      }
    }
  );
}

export async function mergeCloudDataIntoLocal(user: User): Promise<void> {
  const profile = await getDoc(userDoc(user));
  const cloudReplaceAt = profile.exists() ? getProfileCloudReplaceAt(profile.data()) : "";
  for (const collectionName of collectionNames) {
    const records = await getCloudRecords(user, collectionName);
    await putLocalRecords(collectionName, records);
  }
  await putAppSetting("lastCloudMergeAt", new Date().toISOString());
  if (cloudReplaceAt) {
    await putAppSetting(lastKnownCloudReplaceAtKey, cloudReplaceAt);
  }
}

export async function hasCloudProfile(user: User): Promise<boolean> {
  const profile = await getDoc(userDoc(user));
  return profile.exists();
}

export const __cloudSyncTest = {
  getRecordUpdatedAtMs,
  recordsDiffer,
};
