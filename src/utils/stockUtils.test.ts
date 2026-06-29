import { describe, expect, it } from "vitest";
import { isAvailableStock } from "./stockUtils";
import type { StockItem } from "../types/stock";

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
});
