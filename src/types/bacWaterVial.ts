export type BacWaterUsePurpose = "reconstitution" | "dilution" | "other";

export interface BacWaterUse {
  id: string;
  usedAt: string;
  amountMl: number;
  purpose: BacWaterUsePurpose;
  notes?: string;
}

export interface BacWaterVial {
  id: string;
  name: string;
  totalMl: number;
  remainingMl: number;
  openedAt: string;
  uses: BacWaterUse[];
  sourceStockItemId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
