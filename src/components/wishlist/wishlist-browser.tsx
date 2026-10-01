"use client";

import { ArrowDown, ArrowUp, Gift, ListOrdered, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { reorderWishlistAction } from "@/app/actions/wishlist";
import { useApp } from "@/components/app/app-context";
import { NativeSelect } from "@/components/forms/fields";
import { EmptyState } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { ownerKind, ownerLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, type Priority, type WishlistItemDTO } from "@/types/domain";
import { WishlistCard } from "./wishlist-card";

const TABS = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "partner", label: "Partner" },
  { id: "ours", label: "Ours" },
  { id: "funded", label: "Ready" },
  { id: "purchased", label: "Purchased" },
  { id: "archived", label: "Archived" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const SORTS = [
  { id: "funding", label: "Funding order" },
  { id: "progress", label: "Most funded" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "date", label: "Target date" },
  { id: "newest", label: "Newest" },
] as const;
type Sort = (typeof SORTS)[number]["id"];

export function WishlistBrowser({ items }: { items: WishlistItemDTO[] }) {
  const app = useApp();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<Priority | "ALL">("ALL");
  const [sort, setSort] = useState<Sort>("funding");
  const [reordering, setReordering] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const { run: saveOrder, pending: saving } = useAction(reorderWishlistAction);

  const fundingPosition = useMemo(() => {
    const map = new Map<string, number>();
    items.filter((i) => ACTIVE_STATUSES.includes(i.status)).forEach((i, idx) => map.set(i.id, idx + 1));
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((i) => {
      const active = ACTIVE_STATUSES.includes(i.status);
      switch (tab) {
        case "purchased":
          if (i.status !== "PURCHASED") return false;
          break;
        case "archived":
          if (i.status !== "ARCHIVED") return false;
          break;
        case "funded":
          if (i.status !== "FUNDED") return false;
          break;
        default: {
          if (!active) return false;
          const kind = ownerKind(i, app.me.id);
          if (tab === "mine" && kind !== "MINE") return false;
          if (tab === "partner" && kind !== "PARTNER") return false;
          if (tab === "ours" && kind !== "OURS") return false;
        }
      }
      if (priority !== "ALL" && i.priority !== priority) return false;
      if (q && !`${i.name} ${i.category} ${i.description} ${i.notes}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const pct = (i: WishlistItemDTO) => i.allocated / Math.max(1, i.estimatedPrice);
    switch (sort) {
      case "progress":
        list = [...list].sort((a, b) => pct(b) - pct(a));
        break;
      case "price-asc":
        list = [...list].sort((a, b) => a.estimatedPrice - b.estimatedPrice);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.estimatedPrice - a.estimatedPrice);
        break;
      case "date":
        list = [...list].sort((a, b) => (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999"));
        break;
      case "newest":
        list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }
    return list;
  }, [items, tab, query, priority, sort, app.me.id]);

  const activeItems = items.filter((i) => ACTIVE_STATUSES.includes(i.status));

  function startReorder() {
    setOrder(activeItems.map((i) => i.id));
    setReordering(true);
  }

  function move(index: number, delta: number) {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    const res = await saveOrder({ orderedIds: order });
    if (res.ok) setReordering(false);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Gift className="size-6" />}
        title="Nothing here yet"
        description="Add watches, trips, sneakers, dinners… anything you're saving up for together."
        action={
          <Link href="/wishlist/new" className="inline-flex h-11 items-center rounded-2xl bg-primary px-5 font-medium text-primary-foreground">
            Add your first wish
          </Link>
        }
      />
    );
  }

  if (reordering) {
    const byId = new Map(items.map((i) => [i.id, i]));
    return (
      <div>
        <div className="mb-3 rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
          Move items up or down. Priority still comes first; within the same priority, your order decides who gets funded first.
        </div>
        <ol className="space-y-2">
          {order.map((id, index) => {
            const item = byId.get(id)!;
            return (
              <li key={id} className="surface flex items-center gap-3 p-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ink-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <PriorityBadge priority={item.priority} />
                </div>
                <Button variant="outline" size="icon" className="size-11 rounded-full" aria-label={`Move ${item.name} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-11 rounded-full" aria-label={`Move ${item.name} down`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown className="size-4" />
                </Button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12 rounded-2xl" onClick={() => setReordering(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="h-12 rounded-2xl" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save order"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wishes"
          aria-label="Search wishlist"
          className="h-12 w-full rounded-2xl border border-input bg-card pl-11 pr-11 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="Filter wishlist" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {TABS.filter((t) => t.id !== "partner" || app.partner).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
              tab === t.id ? "bg-ink text-ink-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t.id === "partner" ? app.partner?.name ?? "Partner" : t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <NativeSelect aria-label="Priority filter" value={priority} onChange={(e) => setPriority(e.target.value as Priority | "ALL")} className="h-11">
          <option value="ALL">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </NativeSelect>
        <NativeSelect aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {visible.length} {visible.length === 1 ? "item" : "items"}
          {app.settings.orderingMode === "MANUAL" ? " · manual order" : ""}
        </span>
        {activeItems.length > 1 && (tab === "all" || tab === "mine" || tab === "partner" || tab === "ours") ? (
          <button type="button" onClick={startReorder} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground">
            <ListOrdered className="size-4" /> Reorder
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No items match. Try a different filter.</p>
      ) : (
        <div className="mt-1 space-y-2">
          {visible.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              currency={app.currency}
              ownerText={ownerLabel(item, app.members)}
              position={sort === "funding" ? fundingPosition.get(item.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
