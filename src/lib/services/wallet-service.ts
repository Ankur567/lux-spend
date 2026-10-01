import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { percent } from "@/lib/money";
import { monthKey, monthRange, recentMonthKeys } from "@/lib/time";
import { Transaction, type IAppSettings } from "@/models";
import type { MonthStats } from "@/types/domain";
import { getWalletSummary } from "./ledger";
import { getBudgetForMonth, getSettings } from "./settings-service";

export { getWalletSummary };

interface UserMonthRow {
  _id: { userId: Types.ObjectId | null; type: "CONTRIBUTION" | "EXPENSE"; direction: "IN" | "OUT" };
  total: number;
}

/** Contributions and spending (net of reversals) within one month. */
export async function getMonthTotals(
  spaceOid: Types.ObjectId,
  key: string,
  tz: string,
  session: ClientSession | null = null,
): Promise<MonthStats> {
  const { start, end } = monthRange(key, tz);
  const rows = await Transaction.aggregate<UserMonthRow>([
    { $match: { coupleSpaceId: spaceOid, type: { $in: ["CONTRIBUTION", "EXPENSE"] }, occurredAt: { $gte: start, $lt: end } } },
    { $group: { _id: { userId: "$userId", type: "$type", direction: "$direction" }, total: { $sum: "$amount" } } },
  ]).session(session);

  const byUser = new Map<string, { userId: string; contributed: number; spent: number }>();
  let saved = 0;
  let spent = 0;
  for (const row of rows) {
    const uid = row._id.userId?.toString() ?? "unknown";
    const entry = byUser.get(uid) ?? { userId: uid, contributed: 0, spent: 0 };
    if (row._id.type === "CONTRIBUTION") {
      const v = row._id.direction === "IN" ? row.total : -row.total;
      entry.contributed += v;
      saved += v;
    } else {
      const v = row._id.direction === "OUT" ? row.total : -row.total;
      entry.spent += v;
      spent += v;
    }
    byUser.set(uid, entry);
  }
  return { month: key, saved, spent, net: saved - spent, byUser: [...byUser.values()] };
}

export async function getCurrentMonthStats(ctx: MemberContext, settings?: IAppSettings) {
  const s = settings ?? (await getSettings(ctx.spaceOid));
  return getMonthTotals(ctx.spaceOid, monthKey(new Date(), s.timezone), s.timezone);
}

export interface MonthlySeriesPoint {
  month: string;
  saved: number;
  spent: number;
  byUser: Record<string, number>;
}

/** Saved / spent per month for the last `count` months (oldest first). */
export async function getMonthlySeries(ctx: MemberContext, count = 6, settings?: IAppSettings): Promise<MonthlySeriesPoint[]> {
  const s = settings ?? (await getSettings(ctx.spaceOid));
  const keys = recentMonthKeys(count, new Date(), s.timezone);
  const { start } = monthRange(keys[0], s.timezone);
  const rows = await Transaction.aggregate<{
    _id: { month: string; type: "CONTRIBUTION" | "EXPENSE"; direction: "IN" | "OUT"; userId: Types.ObjectId | null };
    total: number;
  }>([
    { $match: { coupleSpaceId: ctx.spaceOid, type: { $in: ["CONTRIBUTION", "EXPENSE"] }, occurredAt: { $gte: start } } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$occurredAt", timezone: s.timezone } },
          type: "$type",
          direction: "$direction",
          userId: "$userId",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const points = new Map<string, MonthlySeriesPoint>(keys.map((k) => [k, { month: k, saved: 0, spent: 0, byUser: {} }]));
  for (const row of rows) {
    const point = points.get(row._id.month);
    if (!point) continue;
    if (row._id.type === "CONTRIBUTION") {
      const v = row._id.direction === "IN" ? row.total : -row.total;
      point.saved += v;
      const uid = row._id.userId?.toString() ?? "unknown";
      point.byUser[uid] = (point.byUser[uid] ?? 0) + v;
    } else {
      point.spent += row._id.direction === "OUT" ? row.total : -row.total;
    }
  }
  return keys.map((k) => points.get(k)!);
}

/** All-time contributed / spent per member. */
export async function getMemberTotals(ctx: MemberContext) {
  const rows = await Transaction.aggregate<UserMonthRow>([
    { $match: { coupleSpaceId: ctx.spaceOid, type: { $in: ["CONTRIBUTION", "EXPENSE"] } } },
    { $group: { _id: { userId: "$userId", type: "$type", direction: "$direction" }, total: { $sum: "$amount" } } },
  ]);
  const totals: Record<string, { contributed: number; spent: number }> = {};
  for (const m of ctx.members) totals[m.id] = { contributed: 0, spent: 0 };
  for (const row of rows) {
    const uid = row._id.userId?.toString();
    if (!uid || !totals[uid]) continue;
    if (row._id.type === "CONTRIBUTION") totals[uid].contributed += row._id.direction === "IN" ? row.total : -row.total;
    else totals[uid].spent += row._id.direction === "OUT" ? row.total : -row.total;
  }
  return totals;
}

export type BudgetLevel = "none" | "ok" | "warn" | "over";

export interface BudgetStatus {
  month: string;
  budget: number;
  spent: number;
  remaining: number;
  pct: number;
  level: BudgetLevel;
  strict: boolean;
  savingsTarget: number;
  saved: number;
  savingsRemaining: number;
  savingsPct: number;
}

export async function getBudgetStatus(ctx: MemberContext, settings?: IAppSettings, stats?: MonthStats): Promise<BudgetStatus> {
  const s = settings ?? (await getSettings(ctx.spaceOid));
  const key = monthKey(new Date(), s.timezone);
  const month = stats ?? (await getMonthTotals(ctx.spaceOid, key, s.timezone));
  const { budget, savingsTarget } = await getBudgetForMonth(ctx.spaceOid, key, s);
  const pct = percent(month.spent, budget);
  const level: BudgetLevel = budget <= 0 ? "none" : month.spent > budget ? "over" : pct >= 80 ? "warn" : "ok";
  return {
    month: key,
    budget,
    spent: month.spent,
    remaining: Math.max(0, budget - month.spent),
    pct,
    level,
    strict: s.strictBudget,
    savingsTarget,
    saved: month.saved,
    savingsRemaining: Math.max(0, savingsTarget - month.saved),
    savingsPct: percent(month.saved, savingsTarget),
  };
}
