import { Download } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/wallet/transaction-list";
import { requireMemberPage } from "@/lib/auth/guard";
import { listTransactions, TRANSACTION_FILTERS, type TransactionFilter } from "@/lib/services/transaction-service";
import { cn } from "@/lib/utils";

export const metadata = { title: "Transactions" };

const LABELS: Record<TransactionFilter, string> = {
  all: "All",
  in: "Money in",
  out: "Money out",
  allocations: "Allocations",
  mine: "Mine",
  partner: "Partner",
};

export default async function TransactionsPage({ searchParams }: PageProps<"/wallet/transactions">) {
  const ctx = await requireMemberPage();
  const sp = await searchParams;
  const raw = typeof sp.filter === "string" ? sp.filter : "all";
  const filter: TransactionFilter = (TRANSACTION_FILTERS as readonly string[]).includes(raw) ? (raw as TransactionFilter) : "all";
  const limitParam = typeof sp.limit === "string" ? Number.parseInt(sp.limit, 10) : 100;
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 50), 500) : 100;
  const transactions = await listTransactions(ctx, { filter, limit });

  return (
    <div className="pt-4 md:pt-8">
      <PageHeader
        title="Transactions"
        backHref="/wallet"
        action={
          <Link href="/settings/data" className="flex size-11 items-center justify-center rounded-full border border-border" aria-label="Export data">
            <Download className="size-4" />
          </Link>
        }
      />
      <nav aria-label="Filter transactions" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {TRANSACTION_FILTERS.filter((f) => f !== "partner" || ctx.partner).map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/wallet/transactions" : `/wallet/transactions?filter=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium",
              filter === f ? "bg-ink text-ink-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {f === "partner" ? ctx.partner?.name ?? LABELS.partner : LABELS[f]}
          </Link>
        ))}
      </nav>
      <TransactionList transactions={transactions} emptyText="Nothing here yet." />
      {transactions.length >= limit && limit < 500 ? (
        <Link
          href={`/wallet/transactions?${new URLSearchParams({ ...(filter !== "all" ? { filter } : {}), limit: String(limit + 100) })}`}
          className="mt-4 flex h-12 items-center justify-center rounded-2xl border border-border text-sm font-medium"
        >
          Load more
        </Link>
      ) : null}
    </div>
  );
}
