import { db } from "./db";
import { activeRecords } from "./activeRecords";
import { DEFAULT_VAULT_USER_ID, type VaultUser } from "../types/vaultUser";

const userColors = ["#6366f1", "#10b981", "#f59e0b"];

export function getVaultUserFallbackName(sortOrder: number) {
  return `User ${sortOrder}`;
}

export function getVaultUserColor(sortOrder: number) {
  return userColors[Math.max(0, sortOrder - 1)] || userColors[0];
}

export async function ensureDefaultVaultUser(): Promise<VaultUser> {
  const existing = await db.vaultUsers.get(DEFAULT_VAULT_USER_ID);
  if (existing && !existing.deletedAt) return existing;

  const nowIso = new Date().toISOString();
  const user: VaultUser = {
    id: DEFAULT_VAULT_USER_ID,
    displayName: getVaultUserFallbackName(1),
    color: getVaultUserColor(1),
    sortOrder: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await db.vaultUsers.put(user);
  return user;
}

export async function createVaultUser(displayName: string): Promise<VaultUser | null> {
  const users = activeRecords(await db.vaultUsers.orderBy("sortOrder").toArray());
  if (users.length >= 3) return null;

  const sortOrder = users.length + 1;
  const nowIso = new Date().toISOString();
  const user: VaultUser = {
    id: crypto.randomUUID(),
    displayName: displayName.trim() || getVaultUserFallbackName(sortOrder),
    color: getVaultUserColor(sortOrder),
    sortOrder,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await db.vaultUsers.put(user);
  return user;
}

export async function renameVaultUser(userId: string, displayName: string) {
  const name = displayName.trim();
  if (!name) return;
  await db.vaultUsers.update(userId, {
    displayName: name,
    updatedAt: new Date().toISOString(),
  });
}
