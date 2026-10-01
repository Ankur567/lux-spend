import { cn } from "@/lib/utils";

const TONES = {
  rose: "bg-rose",
  violet: "bg-violet",
  gold: "bg-gold",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  ink: "bg-foreground",
  light: "bg-white",
} as const;

interface ProgressBarProps {
  value: number;
  tone?: keyof typeof TONES;
  size?: "sm" | "md" | "lg";
  className?: string;
  trackClassName?: string;
  label?: string;
}

export function ProgressBar({ value, tone = "rose", size = "md", className, trackClassName, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        size === "sm" && "h-1.5",
        size === "md" && "h-2.5",
        size === "lg" && "h-3.5",
        trackClassName,
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", TONES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
