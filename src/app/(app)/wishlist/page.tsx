import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { WishlistBrowser } from "@/components/wishlist/wishlist-browser";
import { requireMemberPage } from "@/lib/auth/guard";
import { formatCurrency } from "@/lib/money";
import { listItems } from "@/lib/services/wishlist-service";
import { ACTIVE_STATUSES } from "@/types/domain";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const ctx = await requireMemberPage();
  const items = await listItems(ctx);
  const active = items.filter((i) => ACTIVE_STATUSES.includes(i.status));
  const total = active.reduce((a, i) => a + i.estimatedPrice, 0);

  return (
    <div className="pt-6 md:pt-8">
      <PageHeader
        title="Wishlist"
        subtitle={active.length ? `${active.length} wishes · ${formatCurrency(total, { currency: ctx.space.currency, compact: true })} in total` : undefined}
        action={
          <Link href="/wishlist/new" aria-label="Add wish" className="flex size-11 items-center justify-center rounded-full bg-ink text-ink-foreground">
            <Plus className="size-5" />
          </Link>
        }
      />
      <WishlistBrowser items={items} />
    </div>
  );
}
