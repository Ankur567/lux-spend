import { CalendarDays, Check } from "lucide-react";
import Link from "next/link";
import { ItemThumb } from "@/components/category-icon";
import { CurrencyAmount } from "@/components/currency-amount";
import { PriorityBadge } from "@/components/priority-badge";
import { ProgressBar } from "@/components/progress-bar";
import { formatTargetDate } from "@/lib/format";
import { percent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { WishlistItemDTO } from "@/types/domain";

const STATUS_LABEL: Record<WishlistItemDTO["status"], string> = {
  WISHLIST: "Waiting",
  PARTIALLY_FUNDED: "Saving",
  FUNDED: "Ready to buy",
  PURCHASED: "Purchased",
  ARCHIVED: "Archived",
};

export function WishlistCard({
  item,
  currency,
  ownerText,
  position,
  className,
}: {
  item: WishlistItemDTO;
  currency: string;
  ownerText: string;
  position?: number;
  className?: string;
}) {
  const pct = percent(item.allocated, item.estimatedPrice);
  const purchased = item.status === "PURCHASED";
  const archived = item.status === "ARCHIVED";
  const funded = item.status === "FUNDED";

  return (
    <Link
      href={`/wishlist/${item.id}`}
      className={cn("surface flex gap-3 p-3 transition-transform active:scale-[0.99]", archived && "opacity-60", className)}
    >
      <div className="relative">
        <ItemThumb imageUrl={item.imageUrl} category={item.category} className="size-20 rounded-2xl" iconClassName="size-7" />
        {position ? (
          <span className="absolute -left-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-ink-foreground ring-2 ring-background">
            {position}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-semibold leading-snug">{item.name}</p>
          {!purchased && !archived ? <PriorityBadge priority={item.priority} className="mt-0.5 shrink-0" /> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {ownerText} · {item.category}
          {item.targetDate && !purchased ? (
            <>
              {" · "}
              <CalendarDays className="-mt-0.5 inline size-3" aria-hidden /> {formatTargetDate(item.targetDate)}
            </>
          ) : null}
        </p>
        {purchased ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" aria-hidden /> Purchased for{" "}
            <CurrencyAmount paise={item.actualPurchasePrice ?? item.estimatedPrice} currency={currency} className="font-semibold" />
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
              <span>
                <CurrencyAmount paise={item.allocated} currency={currency} className="font-semibold" />
                <span className="text-muted-foreground">
                  {" "}
                  / <CurrencyAmount paise={item.estimatedPrice} currency={currency} />
                </span>
              </span>
              <span className={cn("text-xs font-medium", funded ? "text-success" : "text-muted-foreground")}>
                {funded ? STATUS_LABEL.FUNDED : archived ? STATUS_LABEL.ARCHIVED : `${pct}%`}
              </span>
            </div>
            <ProgressBar value={pct} tone={funded ? "success" : item.priority === "HIGH" ? "rose" : item.priority === "MEDIUM" ? "violet" : "gold"} size="sm" className="mt-1.5" label={`${item.name} funding progress`} />
          </>
        )}
      </div>
    </Link>
  );
}
