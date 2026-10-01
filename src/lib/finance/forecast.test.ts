import { describe, expect, it } from "vitest";
import type { EngineItem } from "./allocation-engine";
import { forecastFunding } from "./forecast";

const r = (rupees: number) => rupees * 100;
const now = new Date("2026-01-01T00:00:00Z");

function item(id: string, priority: EngineItem["priority"], price: number, allocated = 0): EngineItem {
  return { id, name: id, priority, price, allocated, rank: 0, targetDate: null, createdAt: "2025-12-01T00:00:00Z" };
}

describe("forecastFunding", () => {
  it("marks funded and fundable-now goals", () => {
    const entries = forecastFunding({
      items: [item("done", "HIGH", r(100), r(100)), item("cheap", "HIGH", r(300))],
      unallocated: r(500),
      monthlyContribution: 0,
      now,
    });
    expect(entries[0]).toMatchObject({ itemId: "done", fundedNow: true, daysToFund: 0 });
    expect(entries[1]).toMatchObject({ itemId: "cheap", fundableNow: true, daysToFund: 0 });
  });

  it("queues later goals behind earlier ones at the monthly rate", () => {
    const entries = forecastFunding({
      items: [item("first", "HIGH", r(30440)), item("second", "MEDIUM", r(30440))],
      unallocated: 0,
      monthlyContribution: r(30440),
      now,
    });
    // ₹30,440/month = ₹1,000/day
    expect(entries[0].daysToFund).toBe(31);
    expect(entries[1].daysToFund).toBe(61);
    expect(entries[1].estimatedDate).toBe(new Date("2026-03-03T00:00:00.000Z").toISOString());
  });

  it("uses unallocated money first", () => {
    const [e] = forecastFunding({ items: [item("a", "HIGH", r(2000))], unallocated: r(1000), monthlyContribution: r(30440), now });
    expect(e.daysToFund).toBe(1);
  });

  it("returns no estimate without contributions or beyond the horizon", () => {
    const [none] = forecastFunding({ items: [item("a", "HIGH", r(1000))], unallocated: 0, monthlyContribution: 0, now });
    expect(none.estimatedDate).toBeNull();
    const [far] = forecastFunding({ items: [item("a", "HIGH", r(10_000_000))], unallocated: 0, monthlyContribution: r(100), now });
    expect(far.daysToFund).toBeNull();
  });
});
