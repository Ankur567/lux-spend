import "server-only";
import type { MemberContext } from "@/lib/auth/guard";
import { forecastFunding, type ForecastEntry } from "@/lib/finance/forecast";
import { recentMonthKeys } from "@/lib/time";
import type { IAppSettings } from "@/models";
import { toEngineItems } from "./allocation-service";
import { getActiveItemsWithAllocations, getWalletSummary } from "./ledger";
import { getSettings } from "./settings-service";
import { getMonthlySeries } from "./wallet-service";

export interface ForecastBasis {
  monthlyContribution: number;
  source: "SETTING" | "AVERAGE" | "NONE";
}

export interface ForecastResult {
  basis: ForecastBasis;
  entries: ForecastEntry[];
}

/**
 * Funding estimates for active goals. Uses the configured expected monthly
 * contribution, or the average of the last three full months as a fallback.
 */
export async function getForecast(ctx: MemberContext, settings?: IAppSettings): Promise<ForecastResult> {
  const s = settings ?? (await getSettings(ctx.spaceOid));
  let basis: ForecastBasis = { monthlyContribution: s.expectedMonthlyContribution, source: "SETTING" };

  if (!basis.monthlyContribution) {
    const series = await getMonthlySeries(ctx, 4, s);
    const current = recentMonthKeys(1, new Date(), s.timezone)[0];
    const past = series.filter((p) => p.month !== current && p.saved > 0);
    const sample = past.length ? past : series.filter((p) => p.saved > 0);
    const avg = sample.length ? Math.round(sample.reduce((a, p) => a + p.saved, 0) / sample.length) : 0;
    basis = avg > 0 ? { monthlyContribution: avg, source: "AVERAGE" } : { monthlyContribution: 0, source: "NONE" };
  }

  const [summary, rows] = await Promise.all([getWalletSummary(ctx.spaceOid), getActiveItemsWithAllocations(ctx.spaceOid)]);
  const entries = forecastFunding({
    items: toEngineItems(rows),
    unallocated: summary.unallocated,
    monthlyContribution: basis.monthlyContribution,
    mode: s.orderingMode,
  });
  return { basis, entries };
}
