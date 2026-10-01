import { CalendarDays, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ItemThumb } from "@/components/category-icon";
import { CurrencyAmount } from "@/components/currency-amount";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { ProgressBar } from "@/components/progress-bar";
import { TransactionList } from "@/components/wallet/transaction-list";
import { ItemActions } from "@/components/wishlist/item-actions";
import { requireMemberPage } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { daysUntilLabel, formatTargetDate, memberName, ownerLabel } from "@/lib/format";
import { percent } from "@/lib/money";
import { getForecast } from "@/lib/services/forecast-service";
import { getItemDetail } from "@/lib/services/wishlist-service";
import { ACTIVE_STATUSES } from "@/types/domain";

export default async function WishlistItemPage({ params }: PageProps<"/wishlist/[id]">) {
  const { id } = await params;
  const ctx = await requireMemberPage();
  const { item, history } = await getItemDetail(ctx, id).catch((err) => {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  });
  const active = ACTIVE_STATUSES.includes(item.status);
  const forecast = active ? (await getForecast(ctx)).entries.find((e) => e.itemId === item.id) : undefined;
  const currency = ctx.space.currency;
  const pct = percent(item.allocated, item.estimatedPrice);
  const remaining = Math.max(0, item.estimatedPrice - item.allocated);

  return (
    <div className="pt-4 md:pt-8">
      <PageHeader backHref="/wishlist" className="mb-2" />

      <div className="surface overflow-hidden">
        <ItemThumb imageUrl={item.imageUrl} category={item.category} className="aspect-[16/10] w-full" iconClassName="size-14" />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} long />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{ownerLabel(item, ctx.members)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{item.category}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl leading-tight">{item.name}</h1>
          {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}

          {item.status === "PURCHASED" ? (
            <div className="mt-5 rounded-2xl bg-success-soft p-4 text-sm">
              <p className="font-semibold text-success">Purchased {item.purchasedAt ? `on ${formatTargetDate(item.purchasedAt, "long")}` : ""}</p>
              <p className="mt-1">
                Paid <CurrencyAmount paise={item.actualPurchasePrice ?? item.estimatedPrice} currency={currency} className="font-semibold" /> · estimated{" "}
                <CurrencyAmount paise={item.estimatedPrice} currency={currency} />
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Saved</p>
                  <CurrencyAmount paise={item.allocated} currency={currency} hero className="font-display text-4xl" />
                  <span className="text-muted-foreground">
                    {" "}
                    / <CurrencyAmount paise={item.estimatedPrice} currency={currency} />
                  </span>
                </div>
                <span className="font-display text-3xl tabular">{pct}%</span>
              </div>
              <ProgressBar value={pct} size="lg" tone={item.status === "FUNDED" ? "success" : "rose"} className="mt-3" label="Funding progress" />
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Still needed</p>
                  <CurrencyAmount paise={remaining} currency={currency} className="font-semibold" />
                </div>
                <div className="rounded-2xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Estimated funding</p>
                  <p className="font-semibold">
                    {item.status === "FUNDED"
                      ? "Funded 🎉"
                      : forecast?.fundableNow
                        ? "Today (allocate now)"
                        : forecast?.daysToFund != null
                          ? `in ${daysUntilLabel(forecast.daysToFund)}`
                          : "Not enough data"}
                  </p>
                </div>
              </div>
            </>
          )}

          <dl className="mt-5 space-y-2 text-sm">
            {item.targetDate ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden />
                <dt className="sr-only">Target date</dt>
                <dd>Target {formatTargetDate(item.targetDate, "long")}</dd>
              </div>
            ) : null}
            {item.productUrl ? (
              <div>
                <dt className="sr-only">Product link</dt>
                <dd>
                  <a href={item.productUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-rose">
                    View product <ExternalLink className="size-4" />
                  </a>
                </dd>
              </div>
            ) : null}
            <div className="text-xs text-muted-foreground">
              Added by {memberName(ctx.members, item.createdBy)} on {formatTargetDate(item.createdAt, "long")}
            </div>
          </dl>
          {item.notes ? <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-muted p-3 text-sm">{item.notes}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <ItemActions item={item} hasHistory={history.length > 0} />
      </div>

      <SectionTitle>Money history</SectionTitle>
      <TransactionList transactions={history} emptyText="No money has moved for this wish yet." />
    </div>
  );
}
