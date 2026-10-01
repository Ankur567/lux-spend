import "server-only";
import type { MemberContext } from "@/lib/auth/guard";
import { percent } from "@/lib/money";
import { monthRange, recentMonthKeys } from "@/lib/time";
import { Transaction } from "@/models";
import { toEngineItems } from "./allocation-service";
import { getActiveItemsWithAllocations } from "./ledger";
import { getSettings } from "./settings-service";
import { getMonthlySeries, type MonthlySeriesPoint } from "./wallet-service";
import { sortForAllocation } from "@/lib/finance/allocation-engine";

export interface Insights {
  series: MonthlySeriesPoint[];
  categories: { category: string; amount: number }[];
  funding: { id: string; name: string; allocated: number; price: number; pct: number }[];
  stats: {
    savedThisMonth: number;
    spentThisMonth: number;
    avgMonthlyContribution: number;
    avgMonthlySpending: number;
    wishlistValue: number;
    funded: number;
    remaining: number;
  };
}

export async function getInsights(ctx: MemberContext, months = 6): Promise<Insights> {
  const settings = await getSettings(ctx.spaceOid);
  const series = await getMonthlySeries(ctx, months, settings);
  const keys = recentMonthKeys(months, new Date(), settings.timezone);
  const { start } = monthRange(keys[0], settings.timezone);

  const categoryRows = await Transaction.aggregate<{ _id: { category: string | null; direction: string }; total: number }>([
    { $match: { coupleSpaceId: ctx.spaceOid, type: "EXPENSE", occurredAt: { $gte: start } } },
    { $group: { _id: { category: "$category", direction: "$direction" }, total: { $sum: "$amount" } } },
  ]);
  const byCategory = new Map<string, number>();
  for (const row of categoryRows) {
    const key = row._id.category || "Other";
    byCategory.set(key, (byCategory.get(key) ?? 0) + (row._id.direction === "OUT" ? row.total : -row.total));
  }
  const categories = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const rows = await getActiveItemsWithAllocations(ctx.spaceOid);
  const ordered = sortForAllocation(toEngineItems(rows), settings.orderingMode);
  const funding = ordered.map((i) => ({ id: i.id, name: i.name, allocated: i.allocated, price: i.price, pct: percent(i.allocated, i.price) }));
  const wishlistValue = ordered.reduce((a, i) => a + i.price, 0);
  const funded = ordered.reduce((a, i) => a + Math.min(i.allocated, i.price), 0);

  // Average over months since the first month with any activity in the window.
  const firstActive = series.findIndex((p) => p.saved !== 0 || p.spent !== 0);
  const window = firstActive === -1 ? [] : series.slice(firstActive);
  const avg = (pick: (p: MonthlySeriesPoint) => number) =>
    window.length ? Math.round(window.reduce((a, p) => a + pick(p), 0) / window.length) : 0;
  const current = series[series.length - 1];

  return {
    series,
    categories,
    funding,
    stats: {
      savedThisMonth: current?.saved ?? 0,
      spentThisMonth: current?.spent ?? 0,
      avgMonthlyContribution: avg((p) => p.saved),
      avgMonthlySpending: avg((p) => p.spent),
      wishlistValue,
      funded,
      remaining: Math.max(0, wishlistValue - funded),
    },
  };
}
