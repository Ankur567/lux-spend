import { addDays } from "date-fns";
import type { OrderingMode } from "@/types/domain";
import { remainingNeed, sortForAllocation, type EngineItem } from "./allocation-engine";

export const AVG_DAYS_PER_MONTH = 30.44;
/** Forecasts beyond this horizon are reported as "not within 10 years". */
export const FORECAST_HORIZON_DAYS = 3650;

export interface ForecastEntry {
  itemId: string;
  name: string;
  /** Already fully funded by existing allocations. */
  fundedNow: boolean;
  /** Could be fully funded today using unallocated money. */
  fundableNow: boolean;
  estimatedDate: string | null;
  daysToFund: number | null;
  remaining: number;
}

export interface ForecastInput {
  items: EngineItem[];
  unallocated: number;
  monthlyContribution: number;
  now?: Date;
  mode?: OrderingMode;
}

/**
 * Estimates when each active goal will be fully funded, assuming:
 *  1. current unallocated money is applied first, in funding order;
 *  2. future contributions arrive evenly at `monthlyContribution` per month;
 *  3. new money keeps flowing in priority order (same rules as auto-allocate).
 * These are estimates, not guarantees.
 */
export function forecastFunding({ items, unallocated, monthlyContribution, now = new Date(), mode = "SMART" }: ForecastInput): ForecastEntry[] {
  const dailyRate = monthlyContribution > 0 ? monthlyContribution / AVG_DAYS_PER_MONTH : 0;
  let pool = Math.max(0, unallocated);
  let cumulativeFutureNeed = 0;

  return sortForAllocation(items, mode).map((item) => {
    const need = remainingNeed(item);
    const base = { itemId: item.id, name: item.name, remaining: need };

    if (need === 0) {
      return { ...base, fundedNow: true, fundableNow: true, estimatedDate: now.toISOString(), daysToFund: 0 };
    }
    const fromPool = Math.min(pool, need);
    pool -= fromPool;
    const stillNeeded = need - fromPool;
    if (stillNeeded === 0) {
      return { ...base, fundedNow: false, fundableNow: true, estimatedDate: now.toISOString(), daysToFund: 0 };
    }

    cumulativeFutureNeed += stillNeeded;
    if (dailyRate === 0) {
      return { ...base, fundedNow: false, fundableNow: false, estimatedDate: null, daysToFund: null };
    }
    const days = Math.ceil(cumulativeFutureNeed / dailyRate);
    if (days > FORECAST_HORIZON_DAYS) {
      return { ...base, fundedNow: false, fundableNow: false, estimatedDate: null, daysToFund: null };
    }
    return {
      ...base,
      fundedNow: false,
      fundableNow: false,
      estimatedDate: addDays(now, days).toISOString(),
      daysToFund: days,
    };
  });
}
