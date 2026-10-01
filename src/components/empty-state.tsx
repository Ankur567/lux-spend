import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("surface flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon ? (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-soft text-rose">{icon}</div>
      ) : null}
      <h3 className="font-display text-2xl leading-tight">{title}</h3>
      {description ? <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
