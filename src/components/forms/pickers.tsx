"use client";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import type { MemberDTO } from "@/types/domain";

export function MemberPicker({
  members,
  value,
  onChange,
  label,
}: {
  members: MemberDTO[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
      {members.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-medium transition-all",
              active ? "border-foreground bg-card shadow-sm" : "border-border bg-card/50 text-muted-foreground",
            )}
          >
            <UserAvatar name={m.name} color={m.avatarColor} imageUrl={m.avatarUrl} size="xs" className="ring-0" />
            <span className="truncate">{m.isMe ? `${m.name} (you)` : m.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ChipPicker({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm transition-all",
              active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/80",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
