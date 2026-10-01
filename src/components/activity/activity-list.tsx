import {
  ArrowDownLeft,
  ArrowUpRight,
  Archive,
  Heart,
  type LucideIcon,
  PartyPopper,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  Undo2,
} from "lucide-react";
import { activityText, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityDTO, ActivityType, MemberDTO } from "@/types/domain";

const ICONS: Record<ActivityType, { icon: LucideIcon; tint: string }> = {
  SPACE_CREATED: { icon: Heart, tint: "bg-rose-soft text-rose" },
  PARTNER_JOINED: { icon: Heart, tint: "bg-rose-soft text-rose" },
  CONTRIBUTION_ADDED: { icon: ArrowDownLeft, tint: "bg-success-soft text-success" },
  EXPENSE_RECORDED: { icon: ArrowUpRight, tint: "bg-violet-soft text-violet" },
  ITEM_ADDED: { icon: Plus, tint: "bg-gold-soft text-gold" },
  ITEM_UPDATED: { icon: Pencil, tint: "bg-muted text-muted-foreground" },
  PRIORITY_CHANGED: { icon: Sparkles, tint: "bg-gold-soft text-gold" },
  ITEM_FUNDED: { icon: PartyPopper, tint: "bg-success-soft text-success" },
  ITEM_PURCHASED: { icon: ShoppingBag, tint: "bg-rose-soft text-rose" },
  ITEM_ARCHIVED: { icon: Archive, tint: "bg-muted text-muted-foreground" },
  ITEM_RESTORED: { icon: RotateCcw, tint: "bg-muted text-muted-foreground" },
  FUNDS_ALLOCATED: { icon: Sparkles, tint: "bg-violet-soft text-violet" },
  FUNDS_RELEASED: { icon: Undo2, tint: "bg-muted text-muted-foreground" },
  ALLOCATION_UNDONE: { icon: Undo2, tint: "bg-muted text-muted-foreground" },
  TRANSACTION_REVERSED: { icon: RotateCcw, tint: "bg-warning-soft text-warning" },
  SETTINGS_UPDATED: { icon: Settings, tint: "bg-muted text-muted-foreground" },
};

export function ActivityList({ items, members, currency, className }: { items: ActivityDTO[]; members: MemberDTO[]; currency: string; className?: string }) {
  return (
    <ol className={cn("surface divide-y divide-border/60", className)}>
      {items.map((a) => {
        const { icon: Icon, tint } = ICONS[a.type] ?? ICONS.SETTINGS_UPDATED;
        return (
          <li key={a.id} className="flex items-center gap-3 px-4 py-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tint)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug">{activityText(a, members, currency)}</p>
            <time dateTime={a.createdAt} className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(a.createdAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
