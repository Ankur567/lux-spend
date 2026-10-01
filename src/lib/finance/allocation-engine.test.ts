import { describe, expect, it } from "vitest";
import { planAutoAllocation, planShortfallRelease, sortForAllocation, type EngineItem } from "./allocation-engine";

const r = (rupees: number) => rupees * 100;

function item(partial: Partial<EngineItem> & Pick<EngineItem, "id" | "priority" | "price">): EngineItem {
  return { name: partial.id, targetDate: null, rank: 0, createdAt: "2026-01-01T00:00:00Z", allocated: 0, ...partial };
}

describe("planAutoAllocation", () => {
  it("matches the spec example: ₹10,000 across Funko, Watch, Shoes", () => {
    const items = [
      item({ id: "Shoes", priority: "MEDIUM", price: r(5000), rank: 1 }),
      item({ id: "Funko", priority: "HIGH", price: r(4000), rank: 1 }),
      item({ id: "Watch", priority: "HIGH", price: r(8000), rank: 2 }),
    ];
    const plan = planAutoAllocation(items, r(10000));

    expect(plan.allocatedTotal).toBe(r(10000));
    expect(plan.leftover).toBe(0);
    expect(plan.lines).toEqual([
      { itemId: "Funko", name: "Funko", amount: r(4000), remainingAfter: 0, outcome: "FUNDED" },
      { itemId: "Watch", name: "Watch", amount: r(6000), remainingAfter: r(2000), outcome: "PARTIAL" },
      { itemId: "Shoes", name: "Shoes", amount: 0, remainingAfter: r(5000), outcome: "WAITING" },
    ]);
  });

  it("only funds the remaining need of partially funded goals", () => {
    const plan = planAutoAllocation([item({ id: "A", priority: "HIGH", price: r(1000), allocated: r(700) })], r(1000));
    expect(plan.lines[0].amount).toBe(r(300));
    expect(plan.leftover).toBe(r(700));
  });

  it("skips fully funded goals and keeps leftover when everything is funded", () => {
    const plan = planAutoAllocation(
      [item({ id: "A", priority: "HIGH", price: r(100), allocated: r(100) }), item({ id: "B", priority: "LOW", price: r(50) })],
      r(500),
    );
    expect(plan.lines.map((l) => l.itemId)).toEqual(["B"]);
    expect(plan.leftover).toBe(r(450));
  });

  it("never allocates negative or more than available", () => {
    const plan = planAutoAllocation([item({ id: "A", priority: "HIGH", price: r(100) })], -500);
    expect(plan.allocatedTotal).toBe(0);
    expect(plan.lines[0].outcome).toBe("WAITING");
  });
});

describe("funding order", () => {
  const items = [
    item({ id: "low", priority: "LOW", price: 1 }),
    item({ id: "high-undated-rank1", priority: "HIGH", price: 1, rank: 1 }),
    item({ id: "high-dated-rank3", priority: "HIGH", price: 1, rank: 3, targetDate: "2026-03-01" }),
    item({ id: "high-dated-earlier-rank2", priority: "HIGH", price: 1, rank: 2, targetDate: "2026-02-01" }),
    item({ id: "medium", priority: "MEDIUM", price: 1 }),
  ];

  it("SMART: priority, then target date, then rank", () => {
    expect(sortForAllocation(items, "SMART").map((i) => i.id)).toEqual([
      "high-dated-earlier-rank2",
      "high-dated-rank3",
      "high-undated-rank1",
      "medium",
      "low",
    ]);
  });

  it("MANUAL: priority, then rank, then target date", () => {
    expect(sortForAllocation(items, "MANUAL").map((i) => i.id)).toEqual([
      "high-undated-rank1",
      "high-dated-earlier-rank2",
      "high-dated-rank3",
      "medium",
      "low",
    ]);
  });

  it("falls back to createdAt", () => {
    const sorted = sortForAllocation([
      item({ id: "newer", priority: "HIGH", price: 1, createdAt: "2026-02-01" }),
      item({ id: "older", priority: "HIGH", price: 1, createdAt: "2026-01-01" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["older", "newer"]);
  });
});

describe("planShortfallRelease", () => {
  it("takes from the lowest-priority goals first", () => {
    const items = [
      item({ id: "high", priority: "HIGH", price: r(1000), allocated: r(1000) }),
      item({ id: "medium", priority: "MEDIUM", price: r(500), allocated: r(300) }),
      item({ id: "low", priority: "LOW", price: r(500), allocated: r(200) }),
    ];
    const plan = planShortfallRelease(items, r(400));
    expect(plan.lines).toEqual([
      { itemId: "low", name: "low", amount: r(200) },
      { itemId: "medium", name: "medium", amount: r(200) },
    ]);
    expect(plan.released).toBe(r(400));
  });

  it("reports how much could actually be released", () => {
    const plan = planShortfallRelease([item({ id: "a", priority: "LOW", price: r(100), allocated: r(50) })], r(80));
    expect(plan.released).toBe(r(50));
  });
});
