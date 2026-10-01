import type { AllocationLineResult, OrderingMode, Priority } from "@/types/domain";

export interface EngineItem {
  id: string;
  name: string;
  priority: Priority;
  targetDate: Date | string | null;
  rank: number;
  createdAt: Date | string;
  /** Goal amount in paise. */
  price: number;
  /** Currently allocated paise. */
  allocated: number;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const time = (d: Date | string | null): number | null => (d === null ? null : new Date(d).getTime());

function compareDates(a: Date | string | null, b: Date | string | null): number {
  const ta = time(a);
  const tb = time(b);
  if (ta === tb) return 0;
  if (ta === null) return 1; // undated items go last
  if (tb === null) return -1;
  return ta - tb;
}

/**
 * Funding order. HIGH before MEDIUM before LOW. Within a priority:
 *  - SMART (default): closest target date, then manual rank, then oldest.
 *  - MANUAL: manual rank, then closest target date, then oldest.
 */
export function compareForAllocation(mode: OrderingMode = "SMART") {
  return (a: EngineItem, b: EngineItem): number => {
    const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (byPriority !== 0) return byPriority;
    const byDate = compareDates(a.targetDate, b.targetDate);
    const byRank = a.rank - b.rank;
    if (mode === "MANUAL") {
      if (byRank !== 0) return byRank;
      if (byDate !== 0) return byDate;
    } else {
      if (byDate !== 0) return byDate;
      if (byRank !== 0) return byRank;
    }
    return (time(a.createdAt) ?? 0) - (time(b.createdAt) ?? 0);
  };
}

export function sortForAllocation<T extends EngineItem>(items: T[], mode: OrderingMode = "SMART"): T[] {
  return [...items].sort(compareForAllocation(mode));
}

export function remainingNeed(item: Pick<EngineItem, "price" | "allocated">): number {
  return Math.max(0, item.price - item.allocated);
}

export interface AutoAllocationPlan {
  lines: AllocationLineResult[];
  allocatedTotal: number;
  leftover: number;
}

/**
 * Greedy priority fill: walk items in funding order and give each one as much
 * of the available money as it still needs, until money runs out or every goal
 * is funded. Items that receive nothing are reported as WAITING.
 */
export function planAutoAllocation(items: EngineItem[], available: number, mode: OrderingMode = "SMART"): AutoAllocationPlan {
  let pool = Math.max(0, Math.floor(available));
  const lines: AllocationLineResult[] = [];

  for (const item of sortForAllocation(items, mode)) {
    const need = remainingNeed(item);
    if (need === 0) continue;
    const amount = Math.min(need, pool);
    pool -= amount;
    const remainingAfter = need - amount;
    lines.push({
      itemId: item.id,
      name: item.name,
      amount,
      remainingAfter,
      outcome: amount === 0 ? "WAITING" : remainingAfter === 0 ? "FUNDED" : "PARTIAL",
    });
  }

  const allocatedTotal = lines.reduce((acc, l) => acc + l.amount, 0);
  return { lines, allocatedTotal, leftover: Math.max(0, Math.floor(available)) - allocatedTotal };
}

export interface ReleasePlanLine {
  itemId: string;
  name: string;
  amount: number;
}

/**
 * Chooses which goals give money back when an expense needs more than the
 * unallocated balance. Takes from the end of the funding order first (lowest
 * priority, furthest date) so the most important goals are protected.
 */
export function planShortfallRelease(
  items: EngineItem[],
  shortfall: number,
  mode: OrderingMode = "SMART",
): { lines: ReleasePlanLine[]; released: number } {
  let left = Math.max(0, shortfall);
  const lines: ReleasePlanLine[] = [];
  for (const item of sortForAllocation(items, mode).reverse()) {
    if (left === 0) break;
    if (item.allocated <= 0) continue;
    const amount = Math.min(item.allocated, left);
    left -= amount;
    lines.push({ itemId: item.id, name: item.name, amount });
  }
  return { lines, released: shortfall - left };
}
