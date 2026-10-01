"use client";

import { Bell, ChartPie, Gift, House, Plus, Settings, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/app/app-context";
import { UserAvatar } from "@/components/user-avatar";
import { APP_NAME } from "@/lib/public-config";
import { cn } from "@/lib/utils";

const MOBILE_TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/wishlist", label: "Wishlist", icon: Gift },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

const DESKTOP_LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/wishlist", label: "Wishlist", icon: Gift },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/insights", label: "Insights", icon: ChartPie },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();
  const { openSheet } = useApp();
  const left = MOBILE_TABS.slice(0, 2);
  const right = MOBILE_TABS.slice(2);

  const tab = ({ href, label, icon: Icon }: (typeof MOBILE_TABS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className={cn("size-[22px]", active && "text-rose")} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center px-2">
        {left.map(tab)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => openSheet({ kind: "quick-add" })}
            aria-label="Quick add"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-ink text-ink-foreground shadow-lg shadow-ink/25 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.2} />
          </button>
        </div>
        {right.map(tab)}
      </div>
    </nav>
  );
}

export function SideNavigation() {
  const pathname = usePathname();
  const { openSheet, me, partner, space, unreadNotifications } = useApp();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/60 px-4 py-6 md:flex">
      <Link href="/" className="px-3 font-display text-2xl">
        {APP_NAME}
      </Link>
      <p className="truncate px-3 text-sm text-muted-foreground">{space.name}</p>
      <button
        type="button"
        onClick={() => openSheet({ kind: "quick-add" })}
        className="mt-6 flex h-11 items-center justify-center gap-2 rounded-2xl bg-ink font-medium text-ink-foreground transition-transform active:scale-[0.98]"
      >
        <Plus className="size-4" /> Quick add
      </button>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {DESKTOP_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "text-rose")} aria-hidden />
              <span className="flex-1">{label}</span>
              {href === "/notifications" && unreadNotifications > 0 ? (
                <span className="rounded-full bg-rose px-2 py-0.5 text-[11px] font-semibold text-white">{unreadNotifications}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-2 px-3">
        <UserAvatar name={me.name} color={me.avatarColor} size="sm" />
        {partner ? <UserAvatar name={partner.name} color={partner.avatarColor} size="sm" className="-ml-4 ring-2 ring-background" /> : null}
        <span className="truncate text-sm text-muted-foreground">
          {me.name}
          {partner ? ` & ${partner.name}` : ""}
        </span>
      </div>
    </aside>
  );
}
