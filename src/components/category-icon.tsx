import {
  Bike,
  Clapperboard,
  Gem,
  Gift,
  Home,
  Laptop,
  Package,
  Plane,
  Shirt,
  Sparkles,
  ToyBrick,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Laptop> = {
  tech: Laptop,
  fashion: Shirt,
  collectibles: ToyBrick,
  travel: Plane,
  dining: UtensilsCrossed,
  gifts: Gift,
  home: Home,
  "bike/car": Bike,
  beauty: Sparkles,
  entertainment: Clapperboard,
  jewellery: Gem,
};

const TINTS = ["bg-rose-soft text-rose", "bg-violet-soft text-violet", "bg-gold-soft text-gold", "bg-success-soft text-success"];

export function categoryTint(category: string): string {
  let h = 0;
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category.toLowerCase()] ?? Package;
  return <Icon className={cn("size-5", className)} aria-hidden />;
}

/** Image tile with a category-icon fallback when there is no image. */
export function ItemThumb({
  imageUrl,
  category,
  className,
  iconClassName,
}: {
  imageUrl: string | null;
  category: string;
  className?: string;
  iconClassName?: string;
}) {
  if (imageUrl) {
    return (
      <span className={cn("block shrink-0 overflow-hidden bg-muted", className)}>
        {/* Remote product images come from arbitrary hosts, so next/image optimisation isn't used. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center", categoryTint(category), className)}>
      <CategoryIcon category={category} className={iconClassName} />
    </span>
  );
}
