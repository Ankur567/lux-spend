import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function SettingsGroup({ children }: { children: ReactNode }) {
  return <div className="surface divide-y divide-border/60">{children}</div>;
}

export function SettingsLink({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail?: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground/80">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {detail ? <span className="block truncate text-xs text-muted-foreground">{detail}</span> : null}
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}
