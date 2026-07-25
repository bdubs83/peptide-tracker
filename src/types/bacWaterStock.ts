export interface BacWaterStockItem {
  id: string;
  name: string;
  volumeMlPerVial: number;
  purchasedVialCount: number;
  numberOfVials: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
