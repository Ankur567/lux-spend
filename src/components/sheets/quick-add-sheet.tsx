"use client";

import { ChevronRight, Gift, PlusCircle, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/app-context";
import { BottomSheet } from "./bottom-sheet";

export function QuickAddSheet({ open }: { open: boolean }) {
  const app = useApp();
  const router = useRouter();

  const rows = [
    {
      icon: Gift,
      title: "Add wishlist item",
      text: "Something one of you, or both, would love",
      tint: "bg-rose-soft text-rose",
      onClick: () => {
        app.closeSheet();
        router.push("/wishlist/new");
      },
    },
    {
      icon: PlusCircle,
      title: "Add money",
      text: "Record a contribution to the fund",
      tint: "bg-success-soft text-success",
      onClick: () => app.openSheet({ kind: "contribution" }),
    },
    {
      icon: Receipt,
      title: "Record expense",
      text: "A treat that isn't on the wishlist",
      tint: "bg-violet-soft text-violet",
      onClick: () => app.openSheet({ kind: "expense" }),
    },
  ];

  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && app.closeSheet()} title="Quick add">
      <ul className="space-y-2 pb-4">
        {rows.map(({ icon: Icon, title, text, tint, onClick }) => (
          <li key={title}>
            <button
              type="button"
              onClick={onClick}
              className="surface flex w-full items-center gap-4 rounded-3xl p-4 text-left transition-transform active:scale-[0.99]"
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
