"use client";

import { ArrowDownLeft, Bell, Heart, PartyPopper, ShoppingBag, Target, TriangleAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/app/actions/settings";
import { useAction } from "@/hooks/use-action";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationDTO, NotificationType } from "@/types/domain";

const ICONS: Record<NotificationType, { icon: LucideIcon; tint: string }> = {
  DEPOSIT: { icon: ArrowDownLeft, tint: "bg-success-soft text-success" },
  ITEM_FUNDED: { icon: PartyPopper, tint: "bg-success-soft text-success" },
  NEAR_GOAL: { icon: Target, tint: "bg-rose-soft text-rose" },
  TARGET_PROGRESS: { icon: Target, tint: "bg-gold-soft text-gold" },
  BUDGET_WARNING: { icon: TriangleAlert, tint: "bg-warning-soft text-warning" },
  PARTNER_JOINED: { icon: Heart, tint: "bg-rose-soft text-rose" },
  PURCHASE: { icon: ShoppingBag, tint: "bg-violet-soft text-violet" },
};

export function NotificationList({ notifications }: { notifications: NotificationDTO[] }) {
  const router = useRouter();
  const markRead = useAction(markNotificationsReadAction, { toastSuccess: false });
  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div>
      {unread.length > 0 ? (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => markRead.run()} disabled={markRead.pending} className="min-h-11 px-2 text-sm font-medium text-rose disabled:opacity-50">
            Mark all as read
          </button>
        </div>
      ) : null}
      <ul className="surface divide-y divide-border/60">
        {notifications.map((n) => {
          const { icon: Icon, tint } = ICONS[n.type] ?? { icon: Bell, tint: "bg-muted text-muted-foreground" };
          const body = (
            <>
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tint)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn("truncate text-sm", n.readAt ? "font-medium" : "font-semibold")}>{n.title}</span>
                  {!n.readAt ? <span className="size-2 shrink-0 rounded-full bg-rose" aria-label="Unread" /> : null}
                </span>
                {n.body ? <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span> : null}
                <time suppressHydrationWarning dateTime={n.createdAt} className="mt-1 block text-xs text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </time>
              </span>
            </>
          );
          const onOpen = () => {
            if (!n.readAt) markRead.run([n.id]);
          };
          return (
            <li key={n.id}>
              {n.link && n.link.startsWith("/") ? (
                <Link
                  href={n.link}
                  onClick={onOpen}
                  className={cn("flex gap-3 px-4 py-3.5", !n.readAt && "bg-rose-soft/30")}
                >
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onOpen();
                    router.refresh();
                  }}
                  className={cn("flex w-full gap-3 px-4 py-3.5 text-left", !n.readAt && "bg-rose-soft/30")}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
