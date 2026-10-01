import { ChartPie } from "lucide-react";
import Link from "next/link";
import { CurrencyAmount } from "@/components/currency-amount";
import { EmptyState } from "@/components/empty-state";
import { CategoryChart, SavedSpentChart, TogetherChart } from "@/components/insights/charts";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { requireMemberPage } from "@/lib/auth/guard";
import { daysUntilLabel, formatTargetDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { getInsights } from "@/lib/services/analytics-service";
import { getForecast } from "@/lib/services/forecast-service";
import { getSettings } from "@/lib/services/settings-service";
import { getBudgetStatus } from "@/lib/services/wallet-service";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const ctx = await requireMemberPage();
  const settings = await getSettings(ctx.spaceOid);
  const [insights, forecast, budget] = await Promise.all([getInsights(ctx, 6), getForecast(ctx, settings), getBudgetStatus(ctx, settings)]);
  const currency = ctx.space.currency;
  const { stats } = insights;
  const hasData = insights.series.some((p) => p.saved !== 0 || p.spent !== 0) || insights.funding.length > 0;

  if (!hasData) {
    return (
      <div className="pt-6 md:pt-8">
        <PageHeader title="Insights" />
        <EmptyState
          icon={<ChartPie className="size-6" />}
          title="Insights grow with you"
          description="Add a few contributions and wishes, and you'll see trends, forecasts and where your money goes."
        />
      </div>
    );
  }

  const basisText =
    forecast.basis.source === "SETTING"
      ? `Based on your expected ${formatCurrency(forecast.basis.monthlyContribution, { currency })} per month.`
      : forecast.basis.source === "AVERAGE"
        ? `Based on your recent average of ${formatCurrency(forecast.basis.monthlyContribution, { currency })} per month.`
        : "Set an expected monthly contribution in settings to see estimates.";

  return (
    <div className="pt-6 md:pt-8">
      <PageHeader title="Insights" subtitle="Last 6 months" />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Saved this month" value={stats.savedThisMonth} currency={currency} tone="text-success" />
        <Stat label="Spent this month" value={stats.spentThisMonth} currency={currency} />
        <Stat label="Avg. monthly saving" value={stats.avgMonthlyContribution} currency={currency} />
        <Stat label="Avg. monthly spending" value={stats.avgMonthlySpending} currency={currency} />
        <Stat label="Wishlist value" value={stats.wishlistValue} currency={currency} />
        <Stat label="Still to save" value={stats.remaining} currency={currency} />
      </div>

      {budget.budget > 0 || budget.savingsTarget > 0 ? (
        <>
          <SectionTitle action={<Link href="/settings/budget" className="text-sm font-medium text-rose">Edit</Link>}>This month&apos;s goals</SectionTitle>
          <div className="surface space-y-4 p-4">
            {budget.budget > 0 ? (
              <div>
                <div className="flex justify-between text-sm">
                  <span>Budget{budget.strict ? " (strict)" : ""}</span>
                  <span className="tabular">
                    {formatCurrency(budget.spent, { currency })} / {formatCurrency(budget.budget, { currency })}
                  </span>
                </div>
                <ProgressBar value={budget.pct} tone={budget.level === "over" ? "danger" : budget.level === "warn" ? "warning" : "violet"} className="mt-2" label="Budget used" />
              </div>
            ) : null}
            {budget.savingsTarget > 0 ? (
              <div>
                <div className="flex justify-between text-sm">
                  <span>Savings goal</span>
                  <span className="tabular">
                    {formatCurrency(budget.saved, { currency })} / {formatCurrency(budget.savingsTarget, { currency })}
                  </span>
                </div>
                <ProgressBar value={budget.savingsPct} tone="success" className="mt-2" label="Savings goal progress" />
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <SectionTitle>Saved vs spent</SectionTitle>
      <div className="surface p-4">
        <SavedSpentChart series={insights.series} currency={currency} />
      </div>

      {ctx.members.length > 1 ? (
        <>
          <SectionTitle>Built together</SectionTitle>
          <div className="surface p-4">
            <TogetherChart series={insights.series} members={ctx.members} currency={currency} />
            <p className="mt-2 text-xs text-muted-foreground">Every contribution counts the same: it all goes into one shared fund.</p>
          </div>
        </>
      ) : null}

      {insights.categories.length > 0 ? (
        <>
          <SectionTitle>Spending by category</SectionTitle>
          <div className="surface p-4">
            <CategoryChart categories={insights.categories} currency={currency} />
          </div>
        </>
      ) : null}

      {forecast.entries.length > 0 ? (
        <>
          <SectionTitle>Funding forecast</SectionTitle>
          <div className="surface divide-y divide-border/60">
            {forecast.entries.map((e) => {
              const f = insights.funding.find((x) => x.id === e.itemId);
              return (
                <Link key={e.itemId} href={`/wishlist/${e.itemId}`} className="block px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{e.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {e.fundedNow
                        ? "Funded"
                        : e.fundableNow
                          ? "Can fund today"
                          : e.estimatedDate
                            ? `${formatTargetDate(e.estimatedDate)} · ${daysUntilLabel(e.daysToFund)}`
                            : "—"}
                    </span>
                  </div>
                  {f ? <ProgressBar value={f.pct} size="sm" className="mt-2" tone={e.fundedNow ? "success" : "rose"} label={`${e.name} progress`} /> : null}
                </Link>
              );
            })}
            <p className="px-4 py-3 text-xs text-muted-foreground">{basisText} Estimates assume money keeps flowing by priority and aren&apos;t guarantees.</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, currency, tone }: { label: string; value: number; currency: string; tone?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <CurrencyAmount paise={value} currency={currency} className={`mt-1 block text-lg font-semibold ${tone ?? ""}`} />
    </div>
  );
}
