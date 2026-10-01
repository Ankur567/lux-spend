import { ArrowDownLeft, ArrowUpRight, Bell, ChartPie, Gift, PartyPopper, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";
import { ActivityList } from "@/components/activity/activity-list";
import { SheetButton } from "@/components/app/sheet-button";
import { CurrencyAmount } from "@/components/currency-amount";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { UserAvatar } from "@/components/user-avatar";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { requireMemberPage } from "@/lib/auth/guard";
import { daysUntilLabel, formatTargetDate, ownerLabel } from "@/lib/format";
import { isUpiConfigured } from "@/lib/public-config";
import { listActivity } from "@/lib/services/activity-service";
import { getForecast } from "@/lib/services/forecast-service";
import { unreadCount } from "@/lib/services/notification-service";
import { getSettings } from "@/lib/services/settings-service";
import { getBudgetStatus, getWalletSummary } from "@/lib/services/wallet-service";
import { listItems } from "@/lib/services/wishlist-service";
import { greetingFor } from "@/lib/time";
import { ACTIVE_STATUSES } from "@/types/domain";

export default async function HomePage() {
  const ctx = await requireMemberPage();
  const settings = await getSettings(ctx.spaceOid);
  const [summary, items, budget, activity, forecast, unread] = await Promise.all([
    getWalletSummary(ctx.spaceOid),
    listItems(ctx),
    getBudgetStatus(ctx, settings),
    listActivity(ctx, 6),
    getForecast(ctx, settings),
    unreadCount(ctx),
  ]);
  const currency = ctx.space.currency;
  const active = items.filter((i) => ACTIVE_STATUSES.includes(i.status));
  const ready = active.filter((i) => i.status === "FUNDED");
  const next = active.find((i) => i.status !== "FUNDED");
  const nextForecast = next ? forecast.entries.find((e) => e.itemId === next.id) : undefined;
  const showUpi = isUpiConfigured && currency === "INR";

  return (
    <div className="pt-4 md:pt-8">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greetingFor(new Date(), settings.timezone)},</p>
          <h1 className="truncate font-display text-3xl leading-tight">
            {ctx.me.name}
            {ctx.partner ? <span className="text-muted-foreground"> & {ctx.partner.name}</span> : null}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative flex size-11 items-center justify-center rounded-full hover:bg-muted md:hidden"
          >
            <Bell className="size-5" />
            {unread ? <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-rose ring-2 ring-background" /> : null}
          </Link>
          <div className="flex">
            <UserAvatar name={ctx.me.name} color={ctx.me.avatarColor} imageUrl={ctx.me.avatarUrl} size="md" />
            {ctx.partner ? (
              <UserAvatar name={ctx.partner.name} color={ctx.partner.avatarColor} imageUrl={ctx.partner.avatarUrl} size="md" className="-ml-3" />
            ) : null}
          </div>
        </div>
      </header>

      {!ctx.partner ? (
        <Link href="/settings/couple" className="mt-4 flex items-center gap-3 rounded-2xl bg-rose-soft px-4 py-3 text-sm">
          <span className="text-lg" aria-hidden>
            💌
          </span>
          <span className="flex-1">Invite your partner to share this fund.</span>
          <span className="font-semibold text-rose">Invite</span>
        </Link>
      ) : null}

      <section aria-label="Fund balance" className="relative mt-5 overflow-hidden rounded-[28px] bg-ink p-6 text-ink-foreground shadow-xl shadow-ink/20">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-rose/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-violet/30 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Luxury fund</p>
          <CurrencyAmount paise={summary.available} currency={currency} hero className="mt-1 font-display text-[3.2rem] leading-none" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider opacity-70">For goals</p>
              <CurrencyAmount paise={summary.allocated} currency={currency} className="text-lg font-semibold" />
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider opacity-70">Unallocated</p>
              <CurrencyAmount paise={summary.unallocated} currency={currency} className="text-lg font-semibold" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <SheetButton sheet={{ kind: "contribution" }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink-foreground font-semibold text-ink">
              <ArrowDownLeft className="size-4" /> Add money
            </SheetButton>
            {summary.unallocated > 0 && active.some((i) => i.status !== "FUNDED") ? (
              <SheetButton sheet={{ kind: "allocation" }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 font-semibold">
                <Sparkles className="size-4" /> Allocate
              </SheetButton>
            ) : (
              <SheetButton sheet={{ kind: "expense" }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 font-semibold">
                <ArrowUpRight className="size-4" /> Expense
              </SheetButton>
            )}
          </div>
        </div>
      </section>

      <nav aria-label="Quick actions" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <QuickChip href="/wishlist/new" icon={<Gift className="size-4 text-rose" />} label="Add wish" />
        <SheetButton sheet={{ kind: "expense" }} className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium">
          <ArrowUpRight className="size-4 text-violet" /> Record expense
        </SheetButton>
        {showUpi ? (
          <SheetButton sheet={{ kind: "pay-to-fund" }} className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium">
            <QrCode className="size-4 text-success" /> Pay via UPI
          </SheetButton>
        ) : null}
        <QuickChip href="/insights" icon={<ChartPie className="size-4 text-gold" />} label="Insights" />
      </nav>

      {ready.length > 0 ? (
        <>
          <SectionTitle>Ready to buy</SectionTitle>
          <div className="space-y-2">
            {ready.slice(0, 3).map((item) => (
              <div key={item.id} className="surface flex items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
                  <PartyPopper className="size-5" aria-hidden />
                </span>
                <Link href={`/wishlist/${item.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Fully funded · <CurrencyAmount paise={item.estimatedPrice} currency={currency} /></p>
                </Link>
                <SheetButton sheet={{ kind: "purchase", item }} className="h-10 rounded-full bg-success px-4 text-sm font-semibold text-white">
                  Buy
                </SheetButton>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {next ? (
        <>
          <SectionTitle>Next up</SectionTitle>
          <Link href={`/wishlist/${next.id}`} className="surface block p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-2xl leading-tight">{next.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <CurrencyAmount paise={Math.max(0, next.estimatedPrice - next.allocated)} currency={currency} className="font-medium text-foreground" /> to go
                  {next.targetDate ? ` · target ${formatTargetDate(next.targetDate)}` : ""}
                </p>
              </div>
              <span className="font-display text-3xl tabular">{Math.round((next.allocated / Math.max(1, next.estimatedPrice)) * 100)}%</span>
            </div>
            <ProgressBar value={(next.allocated / Math.max(1, next.estimatedPrice)) * 100} size="lg" className="mt-4" label={`${next.name} progress`} />
            <p className="mt-3 text-xs text-muted-foreground">
              {nextForecast?.fundableNow
                ? "You have enough unallocated money to fund this today."
                : nextForecast?.daysToFund != null
                  ? `Estimated funded in ${daysUntilLabel(nextForecast.daysToFund)} at your current pace.`
                  : "Add a regular contribution to see an estimate."}
            </p>
          </Link>
        </>
      ) : null}

      <SectionTitle action={<Link href="/insights" className="text-sm font-medium text-rose">Insights</Link>}>This month</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Saved</p>
          <CurrencyAmount paise={budget.saved} currency={currency} className="mt-1 block text-xl font-semibold text-success" />
          {budget.savingsTarget > 0 ? (
            <>
              <ProgressBar value={budget.savingsPct} tone="success" size="sm" className="mt-3" label="Savings goal" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {budget.savingsRemaining > 0 ? (
                  <>
                    <CurrencyAmount paise={budget.savingsRemaining} currency={currency} /> to goal
                  </>
                ) : (
                  "Goal reached 🎉"
                )}
              </p>
            </>
          ) : (
            <Link href="/settings/budget" className="mt-3 block text-[11px] text-muted-foreground underline underline-offset-2">
              Set a savings goal
            </Link>
          )}
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Spent</p>
          <CurrencyAmount paise={budget.spent} currency={currency} className="mt-1 block text-xl font-semibold" />
          {budget.budget > 0 ? (
            <>
              <ProgressBar value={budget.pct} tone={budget.level === "over" ? "danger" : budget.level === "warn" ? "warning" : "violet"} size="sm" className="mt-3" label="Monthly budget" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {budget.level === "over" ? (
                  <span className="text-destructive">Over budget</span>
                ) : (
                  <>
                    <CurrencyAmount paise={budget.remaining} currency={currency} /> left
                  </>
                )}
              </p>
            </>
          ) : (
            <Link href="/settings/budget" className="mt-3 block text-[11px] text-muted-foreground underline underline-offset-2">
              Set a monthly budget
            </Link>
          )}
        </div>
      </div>

      <SectionTitle action={items.length ? <Link href="/wishlist" className="text-sm font-medium text-rose">See all</Link> : undefined}>
        Wishlist
      </SectionTitle>
      {active.length === 0 ? (
        <EmptyState
          icon={<Gift className="size-6" />}
          title="Start your wishlist"
          description="Add the first thing you're dreaming of. Money you add will flow to it automatically."
          action={
            <Link href="/wishlist/new" className="inline-flex h-11 items-center rounded-2xl bg-primary px-5 font-medium text-primary-foreground">
              Add a wish
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {active.slice(0, 4).map((item, i) => (
            <WishlistCard key={item.id} item={item} currency={currency} ownerText={ownerLabel(item, ctx.members)} position={i + 1} />
          ))}
        </div>
      )}

      {activity.length > 0 ? (
        <>
          <SectionTitle action={<Link href="/activity" className="text-sm font-medium text-rose">See all</Link>}>Recent activity</SectionTitle>
          <ActivityList items={activity} members={ctx.members} currency={currency} />
        </>
      ) : null}
    </div>
  );
}

function QuickChip({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium">
      {icon} {label}
    </Link>
  );
}
