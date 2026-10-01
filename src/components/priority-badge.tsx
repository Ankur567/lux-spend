import { Feather, Flame, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL } from "@/lib/format";
import type { Priority } from "@/types/domain";

const STYLES: Record<Priority, { icon: typeof Flame; className: string }> = {
  HIGH: { icon: Flame, className: "bg-rose text-white dark:text-background font-semibold" },
  MEDIUM: { icon: Sparkle, className: "bg-violet-soft text-violet font-medium" },
  LOW: { icon: Feather, className: "bg-muted text-muted-foreground font-medium" },
};

export function PriorityBadge({ priority, className, long }: { priority: Priority; className?: string; long?: boolean }) {
  const { icon: Icon, className: tone } = STYLES[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide", tone, className)}>
      <Icon className="size-3" aria-hidden />
      {PRIORITY_LABEL[priority]}
      {long ? " priority" : ""}
    </span>
  );
}
