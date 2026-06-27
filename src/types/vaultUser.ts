export interface VaultUser {
  id: string;
  displayName: string;
  color: string;
  sortOrder: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_VAULT_USER_ID = "user-1";
