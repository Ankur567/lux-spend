import { describe, expect, it } from "vitest";
import type { Direction, TransactionType } from "@/types/domain";
import { computeItemAllocations, computeWalletTotals, fundingStatus, type LedgerGroup } from "./ledger-math";

const r = (rupees: number) => rupees * 100;

interface Entry {
  type: TransactionType;
  direction: Direction;
  amount: number;
  itemId?: string;
}

/** Mimics the Mongo aggregation: group entries by (type, direction). */
function group(entries: Entry[]): LedgerGroup[] {
  const map = new Map<string, LedgerGroup>();
  for (const e of entries) {
    const key = `${e.type}:${e.direction}`;
    const g = map.get(key) ?? { type: e.type, direction: e.direction, total: 0 };
    g.total += e.amount;
    map.set(key, g);
  }
  return [...map.values()];
}

function itemGroups(entries: Entry[]) {
  return entries.filter((e) => e.itemId).map((e) => ({ itemId: e.itemId!, type: e.type, total: e.amount }));
}

describe("computeWalletTotals", () => {
  it("derives available, allocated and unallocated from the ledger", () => {
    const totals = computeWalletTotals(
      group([
        { type: "CONTRIBUTION", direction: "IN", amount: r(10000) },
        { type: "CONTRIBUTION", direction: "IN", amount: r(5000) },
        { type: "ALLOCATION", direction: "INTERNAL", amount: r(8000) },
        { type: "EXPENSE", direction: "OUT", amount: r(1200) },
      ]),
    );
    expect(totals).toMatchObject({ contributed: r(15000), spent: r(1200), available: r(13800), allocated: r(8000), unallocated: r(5800) });
  });

  it("purchase cheaper than allocated returns the difference to unallocated (spec: ₹7,899 vs ₹8,000)", () => {
    const entries: Entry[] = [
      { type: "CONTRIBUTION", direction: "IN", amount: r(8000) },
      { type: "ALLOCATION", direction: "INTERNAL", amount: r(8000), itemId: "funko" },
      // purchase: release the whole allocation, then record the actual price
      { type: "DEALLOCATION", direction: "INTERNAL", amount: r(8000), itemId: "funko" },
      { type: "EXPENSE", direction: "OUT", amount: r(7899), itemId: "funko" },
    ];
    const totals = computeWalletTotals(group(entries));
    expect(totals.available).toBe(r(101));
    expect(totals.allocated).toBe(0);
    expect(totals.unallocated).toBe(r(101));
    expect(computeItemAllocations(itemGroups(entries)).get("funko")).toBe(0);
  });

  it("purchase pricier than allocated takes the difference from unallocated", () => {
    const totals = computeWalletTotals(
      group([
        { type: "CONTRIBUTION", direction: "IN", amount: r(10000) },
        { type: "ALLOCATION", direction: "INTERNAL", amount: r(8000) },
        { type: "DEALLOCATION", direction: "INTERNAL", amount: r(8000) },
        { type: "EXPENSE", direction: "OUT", amount: r(8500) },
      ]),
    );
    expect(totals.available).toBe(r(1500));
    expect(totals.unallocated).toBe(r(1500));
  });

  it("reversals cancel the original entry", () => {
    const totals = computeWalletTotals(
      group([
        { type: "CONTRIBUTION", direction: "IN", amount: r(5000) },
        { type: "CONTRIBUTION", direction: "IN", amount: r(2000) },
        { type: "CONTRIBUTION", direction: "OUT", amount: r(2000) }, // reversal of the duplicate
        { type: "EXPENSE", direction: "OUT", amount: r(700) },
        { type: "EXPENSE", direction: "IN", amount: r(700) }, // reversal of a mistaken expense
      ]),
    );
    expect(totals.contributed).toBe(r(5000));
    expect(totals.spent).toBe(0);
    expect(totals.available).toBe(r(5000));
  });

  it("refunds and adjustments affect the fund", () => {
    const totals = computeWalletTotals(
      group([
        { type: "CONTRIBUTION", direction: "IN", amount: r(1000) },
        { type: "REFUND", direction: "IN", amount: r(200) },
        { type: "ADJUSTMENT", direction: "OUT", amount: r(50) },
      ]),
    );
    expect(totals.available).toBe(r(1150));
  });
});

describe("computeItemAllocations / fundingStatus", () => {
  it("nets allocations per item", () => {
    const map = computeItemAllocations([
      { itemId: "a", type: "ALLOCATION", total: r(500) },
      { itemId: "a", type: "DEALLOCATION", total: r(200) },
      { itemId: "b", type: "ALLOCATION", total: r(100) },
      { itemId: "b", type: "EXPENSE", total: r(9999) },
    ]);
    expect(map.get("a")).toBe(r(300));
    expect(map.get("b")).toBe(r(100));
  });

  it("derives funding status", () => {
    expect(fundingStatus(0, 100)).toBe("WISHLIST");
    expect(fundingStatus(50, 100)).toBe("PARTIALLY_FUNDED");
    expect(fundingStatus(100, 100)).toBe("FUNDED");
    expect(fundingStatus(120, 100)).toBe("FUNDED");
  });
});
