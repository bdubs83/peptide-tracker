import { describe, expect, it } from "vitest";
import { getUniqueOpenVialTargets, groupStockItems, isAvailableStock, sortStockLotsForUse } from "./stockUtils";
import type { StockItem } from "../types/stock";
import type { Peptide } from "../types/peptide";

const makeStockItem = (overrides: Partial<StockItem> = {}): StockItem => ({
  id: "stock-1",
  name: "KLOW",
  mgPerVial: "5",
  numberOfVials: "1",
  createdAt: "2026-06-29T12:00:00.000Z",
  updatedAt: "2026-06-29T12:00:00.000Z",
  ...overrides,
});

describe("stockUtils", () => {
  it("treats stock without an order date as already available", () => {
    expect(isAvailableStock(makeStockItem(), "2026-06-29")).toBe(true);
  });

  it("requires a received date when an order date is tracked", () => {
    expect(isAvailableStock(makeStockItem({ orderedDate: "2026-06-28" }), "2026-06-29")).toBe(false);
    expect(
      isAvailableStock(
        makeStockItem({
          orderedDate: "2026-06-28",
          receivedDate: "2026-06-29",
        }),
        "2026-06-29"
      )
    ).toBe(true);
  });

  it("groups purchases by normalized product name and strength while preserving lots", () => {
    const groups = groupStockItems([
      makeStockItem({ id: "a", name: "Retatrutide", mgPerVial: "20", numberOfVials: "2", supplier: "Vendor A" }),
      makeStockItem({ id: "b", name: " retatrutide ", mgPerVial: "20.0", numberOfVials: "3", supplier: "Vendor B" }),
      makeStockItem({ id: "c", name: "Retatrutide", mgPerVial: "30", numberOfVials: "1" }),
    ]);

    expect(groups).toHaveLength(2);
    const twentyMg = groups.find((group) => group.mgPerVial === 20);
    expect(twentyMg?.lots).toHaveLength(2);
    expect(twentyMg?.remainingVials).toBe(5);
    expect(twentyMg?.totalRemainingMg).toBe(100);
  });

  it("uses the oldest received purchase first", () => {
    const ordered = sortStockLotsForUse([
      makeStockItem({ id: "new", receivedDate: "2026-06-20" }),
      makeStockItem({ id: "old", receivedDate: "2026-06-01" }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["old", "new"]);
  });

  it("shows one pull target for users sharing the same open vial", () => {
    const basePeptide = {
      name: "Retatrutide",
      vialMg: 60,
      openVialId: "shared-vial",
    } as Peptide;
    const targets = getUniqueOpenVialTargets([
      { ...basePeptide, id: "user-one-peptide" },
      { ...basePeptide, id: "user-two-peptide" },
      { ...basePeptide, id: "separate-vial-peptide", openVialId: "separate-vial" },
    ]);

    expect(targets.map((peptide) => peptide.id)).toEqual(["user-one-peptide", "separate-vial-peptide"]);
  });
});
