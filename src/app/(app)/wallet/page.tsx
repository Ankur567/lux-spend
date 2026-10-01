import { ArrowDownLeft, ArrowUpRight, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";
import { SheetButton } from "@/components/app/sheet-button";
import { CurrencyAmount } from "@/components/currency-amount";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { TransactionList } from "@/components/wallet/transaction-list";
import { AllocationBatches, RebalanceButton } from "@/components/wallet/wallet-tools";
import { requireMemberPage } from "@/lib/auth/guard";
import { percent } from "@/lib/money";
import { isUpiConfigured } from "@/lib/public-config";
import { listRecentBatches } from "@/lib/services/allocation-service";
import { listTransactions } from "@/lib/services/transaction-service";
import { getMemberTotals, getWalletSummary } from "@/lib/services/wallet-service";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const ctx = await requireMemberPage();
  const [summary, transactions, batches, totals] = await Promise.all([
    getWalletSummary(ctx.spaceOid),
    listTransactions(ctx, { limit: 8 }),
    listRecentBatches(ctx, 6),
    getMemberTotals(ctx),
  ]);
  const currency = ctx.space.currency;
  const allocatedPct = percent(summary.allocated, Math.max(summary.available, 0));
  const totalContributed = Object.values(totals).reduce((a, t) => a + t.contributed, 0);

  return (
    <div className="pt-6 md:pt-8">
      <PageHeader title="Wallet" subtitle="Your shared luxury fund. Every rupee is tracked." />

      <section className="surface p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Available balance</p>
        <CurrencyAmount paise={summary.available} currency={currency} hero className="mt-1 font-display text-5xl leading-none" />

        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${allocatedPct}% allocated to goals`}>
          <div className="h-full bg-rose" style={{ width: `${allocatedPct}%` }} />
          <div className="h-full bg-gold/60" style={{ width: `${Math.max(0, 100 - allocatedPct)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-rose" /> Allocated to goals
            </p>
            <CurrencyAmount paise={summary.allocated} currency={currency} className="font-semibold" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-gold/60" /> Unallocated
            </p>
            <CurrencyAmount paise={summary.unallocated} currency={currency} className="font-semibold" />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-center text-xs">
          <div>
            <dt className="text-muted-foreground">Contributed</dt>
            <dd className="mt-0.5 font-semibold"><CurrencyAmount paise={summary.contributed} currency={currency} compact /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Spent</dt>
            <dd className="mt-0.5 font-semibold"><CurrencyAmount paise={summary.spent} currency={currency} compact /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Refunds</dt>
            <dd className="mt-0.5 font-semibold"><CurrencyAmount paise={summary.refunded} currency={currency} compact /></dd>
          </div>
        </dl>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SheetButton sheet={{ kind: "contribution" }} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-semibold text-ink-foreground">
          <ArrowDownLeft className="size-4" /> Add money
        </SheetButton>
        <SheetButton sheet={{ kind: "expense" }} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium">
          <ArrowUpRight className="size-4 text-violet" /> Record expense
        </SheetButton>
        <SheetButton sheet={{ kind: "allocation" }} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium">
          <Sparkles className="size-4 text-rose" /> Allocate
        </SheetButton>
        <RebalanceButton disabled={summary.available <= 0} />
        {isUpiConfigured && currency === "INR" ? (
          <SheetButton sheet={{ kind: "pay-to-fund" }} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium">
            <QrCode className="size-4 text-success" /> Pay to fund via UPI
          </SheetButton>
        ) : null}
      </div>

      {ctx.members.length > 1 && totalContributed > 0 ? (
        <>
          <SectionTitle>Together so far</SectionTitle>
          <div className="surface p-4">
            <p className="text-sm text-muted-foreground">
              You&apos;ve built <CurrencyAmount paise={totalContributed} currency={currency} className="font-semibold text-foreground" /> together 💞
            </p>
            <ul className="mt-3 space-y-2">
              {ctx.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <UserAvatar name={m.name} color={m.avatarColor} imageUrl={m.avatarUrl} size="sm" />
                  <span className="flex-1">{m.isMe ? "You" : m.name}</span>
                  <CurrencyAmount paise={totals[m.id]?.contributed ?? 0} currency={currency} className="font-medium" />
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <SectionTitle>Recent allocations</SectionTitle>
      <AllocationBatches batches={batches} />

      <SectionTitle action={<Link href="/wallet/transactions" className="text-sm font-medium text-rose">All transactions</Link>}>
        Recent transactions
      </SectionTitle>
      <TransactionList transactions={transactions} emptyText="Add money to start your fund." />
    </div>
  );
}
