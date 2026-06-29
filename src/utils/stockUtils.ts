import type { StockItem } from "../types/stock";
import { getLocalDateString } from "./dateUtils";

export function hasUsableVialCount(item: StockItem) {
  const vialCount = item.numberOfVials ? Number(item.numberOfVials) : NaN;
  const mgPerVial = item.mgPerVial ? Number(item.mgPerVial) : NaN;
  return (
    Number.isFinite(vialCount) &&
    vialCount > 0 &&
    Number.isFinite(mgPerVial) &&
    mgPerVial > 0
  );
}

export function isReceivedStock(item: StockItem, today = getLocalDateString()) {
  if (!item.orderedDate) return true;
  return Boolean(item.receivedDate && item.receivedDate <= today);
}

export function isAvailableStock(item: StockItem, today = getLocalDateString()) {
  return hasUsableVialCount(item) && isReceivedStock(item, today);
}
