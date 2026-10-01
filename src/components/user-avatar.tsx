import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  color?: string;
  imageUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl" };

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function UserAvatar({ name, color = "#E58F9E", imageUrl, size = "md", className }: UserAvatarProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-background", SIZES[size], className)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name) || "?"
      )}
    </span>
  );
}
