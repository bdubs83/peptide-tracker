export interface StockItem {
  id: string;
  name: string;
  productKey?: string;
  mgPerVial?: string;
  purchasedVialCount?: string;
  numberOfVials?: string;
  batchNumber?: string;
  manufacturerDate?: string;
  orderedDate?: string;
  receivedDate?: string;
  supplier?: string;
  price?: string;
  storedLocation?: string;
  notes?: string;
  coaFileName?: string;
  coaDataUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
