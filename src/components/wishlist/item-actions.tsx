"use client";

import { Archive, ArchiveRestore, Minus, PartyPopper, Pencil, Sparkles, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  archiveWishlistItemAction,
  changePriorityAction,
  deleteWishlistItemAction,
  restoreWishlistItemAction,
  undoPurchaseAction,
} from "@/app/actions/wishlist";
import { releaseFundsAction } from "@/app/actions/wallet";
import { useApp } from "@/components/app/app-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field, MoneyInput, Segmented } from "@/components/forms/fields";
import { BottomSheet } from "@/components/sheets/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { formatCurrency, paiseToInput } from "@/lib/money";
import { ACTIVE_STATUSES, type Priority, type WishlistItemDTO } from "@/types/domain";

type Confirm = "archive" | "delete" | "undo-purchase" | null;

export function ItemActions({ item, hasHistory }: { item: WishlistItemDTO; hasHistory: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const archive = useAction(archiveWishlistItemAction, { toastSuccess: false });
  const restore = useAction(restoreWishlistItemAction);
  const remove = useAction(deleteWishlistItemAction);
  const undo = useAction(undoPurchaseAction);
  const priority = useAction(changePriorityAction);
  const release = useAction(releaseFundsAction);
  const active = ACTIVE_STATUSES.includes(item.status);
  const remaining = Math.max(0, item.estimatedPrice - item.allocated);
  const fmt = (v: number) => formatCurrency(v, { currency: app.currency });

  async function onArchive() {
    const res = await archive.run(item.id);
    setConfirm(null);
    if (res.ok) toast.success(res.data.message ?? "Archived");
  }

  async function onDelete() {
    const res = await remove.run(item.id);
    setConfirm(null);
    if (res.ok) router.replace("/wishlist");
  }

  async function onUndoPurchase() {
    await undo.run(item.id);
    setConfirm(null);
  }

  async function onRelease() {
    const res = await release.run({ itemId: item.id, amount: releaseAmount });
    if (res.ok) setReleaseOpen(false);
  }

  return (
    <div className="space-y-3">
      {active ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {remaining > 0 ? (
              <Button className="h-12 rounded-2xl" onClick={() => app.openSheet({ kind: "allocation", focusItemId: item.id })}>
                <Sparkles className="size-4" /> Add funds
              </Button>
            ) : null}
            <Button
              className={remaining > 0 ? "h-12 rounded-2xl bg-success text-white hover:bg-success/90" : "col-span-2 h-12 rounded-2xl bg-success text-white hover:bg-success/90"}
              onClick={() => app.openSheet({ kind: "purchase", item })}
            >
              <PartyPopper className="size-4" /> Mark purchased
            </Button>
          </div>

          <div className="surface p-4">
            <p className="mb-2 text-sm font-medium">Priority</p>
            <Segmented<Priority>
              name="Priority"
              value={item.priority}
              onChange={(p) => priority.run({ itemId: item.id, priority: p })}
              options={[
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">Changing priority affects future auto-allocation. Use Rebalance in the wallet to redistribute existing money.</p>
          </div>
        </>
      ) : null}

      <div className="surface divide-y divide-border/60">
        <ActionRow href={`/wishlist/${item.id}/edit`} icon={<Pencil className="size-4" />} label="Edit details" />
        {active && item.allocated > 0 ? (
          <ActionRow
            icon={<Minus className="size-4" />}
            label="Return money to unallocated"
            onClick={() => {
              setReleaseAmount(paiseToInput(item.allocated));
              setReleaseOpen(true);
            }}
          />
        ) : null}
        {active ? <ActionRow icon={<Archive className="size-4" />} label="Archive" onClick={() => setConfirm("archive")} /> : null}
        {item.status === "ARCHIVED" ? (
          <ActionRow icon={<ArchiveRestore className="size-4" />} label="Restore to wishlist" onClick={() => restore.run(item.id)} disabled={restore.pending} />
        ) : null}
        {item.status === "PURCHASED" ? (
          <ActionRow icon={<Undo2 className="size-4" />} label="Undo purchase" onClick={() => setConfirm("undo-purchase")} />
        ) : null}
        {!hasHistory ? (
          <ActionRow icon={<Trash2 className="size-4" />} label="Delete" destructive onClick={() => setConfirm("delete")} />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Archive this wish?"
        description={item.allocated > 0 ? `${fmt(item.allocated)} saved for it will return to your unallocated balance. History is kept.` : "You can restore it any time."}
        confirmLabel="Archive"
        pending={archive.pending}
        onConfirm={onArchive}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this wish?"
        description="It has no money history, so it will be removed permanently."
        confirmLabel="Delete"
        destructive
        pending={remove.pending}
        onConfirm={onDelete}
      />
      <ConfirmDialog
        open={confirm === "undo-purchase"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Undo purchase?"
        description="The purchase expense is reversed and the item goes back on your wishlist. You can then re-allocate funds to it."
        confirmLabel="Undo purchase"
        pending={undo.pending}
        onConfirm={onUndoPurchase}
      />

      <BottomSheet
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        title="Return money"
        description={`Move money saved for ${item.name} back to unallocated.`}
        footer={
          <Button className="h-12 w-full rounded-2xl text-base" onClick={onRelease} disabled={release.pending}>
            {release.pending ? "Saving…" : "Return money"}
          </Button>
        }
      >
        <Field label={`Amount (up to ${fmt(item.allocated)})`} htmlFor="release-amount">
          <MoneyInput id="release-amount" big currency={app.currency} value={releaseAmount} onChange={(e) => setReleaseAmount(e.target.value)} />
        </Field>
      </BottomSheet>
    </div>
  );
}

function ActionRow({
  href,
  icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const cls = `flex min-h-13 w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium disabled:opacity-50 ${destructive ? "text-destructive" : ""}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon} {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {icon} {label}
    </button>
  );
}
