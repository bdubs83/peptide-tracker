import type { StockItem } from "../types/stock";
import type { Peptide } from "../types/peptide";
import { getLocalDateString } from "./dateUtils";

export type StockProductGroup = {
  key: string;
  name: string;
  mgPerVial: number | null;
  lots: StockItem[];
  remainingVials: number;
  totalRemainingMg: number | null;
};

export const normalizeStockProductName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

const normalizeStrength = (value: string | number | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(Number(parsed.toFixed(6))) : "unknown";
};

export const getStockProductKeyFromValues = (name: string, mgPerVial?: string | number) =>
  `${normalizeStockProductName(name)}::${normalizeStrength(mgPerVial)}`;

export const getStockProductKey = (item: StockItem) =>
  item.productKey || getStockProductKeyFromValues(item.name, item.mgPerVial);

export const isSameStockProductName = (left: string, right: string) =>
  normalizeStockProductName(left) === normalizeStockProductName(right);

export const isExactStockProductForVial = (item: StockItem, peptideName: string, vialMg: number) =>
  isSameStockProductName(item.name, peptideName) && normalizeStrength(item.mgPerVial) === normalizeStrength(vialMg);

export const sortStockLotsForUse = (items: StockItem[]) =>
  [...items].sort((left, right) => {
    const leftDate = left.receivedDate || left.orderedDate || left.createdAt;
    const rightDate = right.receivedDate || right.orderedDate || right.createdAt;
    return leftDate.localeCompare(rightDate) || left.createdAt.localeCompare(right.createdAt);
  });

export const getUniqueOpenVialTargets = (peptides: Peptide[]) => {
  const targets = new Map<string, Peptide>();
  for (const peptide of peptides) {
    const openVialId = peptide.openVialId || peptide.id;
    if (!targets.has(openVialId)) targets.set(openVialId, peptide);
  }
  return Array.from(targets.values());
};

export const groupStockItems = (items: StockItem[]): StockProductGroup[] => {
  const groups = new Map<string, StockItem[]>();
  for (const item of items) {
    const key = getStockProductKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  return Array.from(groups.entries())
    .map(([key, lots]) => {
      const representative = lots[0];
      const mgPerVial = Number(representative.mgPerVial);
      const normalizedMg = Number.isFinite(mgPerVial) && mgPerVial > 0 ? mgPerVial : null;
      const remainingVials = lots.reduce((sum, lot) => {
        const count = Number(lot.numberOfVials);
        return sum + (Number.isFinite(count) && count > 0 ? count : 0);
      }, 0);
      return {
        key,
        name: representative.name,
        mgPerVial: normalizedMg,
        lots: [...lots].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
        remainingVials,
        totalRemainingMg: normalizedMg === null ? null : normalizedMg * remainingVials,
      };
    })
    .sort((left, right) => {
      const leftLatest = left.lots[0]?.createdAt || "";
      const rightLatest = right.lots[0]?.createdAt || "";
      return rightLatest.localeCompare(leftLatest) || left.name.localeCompare(right.name);
    });
};

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
