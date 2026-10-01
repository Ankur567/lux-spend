import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/money";

interface CurrencyAmountProps {
  paise: number;
  currency?: string;
  signed?: boolean;
  compact?: boolean;
  className?: string;
  /** Renders the currency symbol smaller for big hero numbers. */
  hero?: boolean;
}

export function CurrencyAmount({ paise, currency = "INR", signed, compact, className, hero }: CurrencyAmountProps) {
  const text = formatCurrency(paise, { currency, signed, compact });
  if (!hero) return <span className={cn("tabular", className)}>{text}</span>;

  const match = text.match(/^([+−-]?)(\D*?)\s?([\d.,]+.*)$/);
  if (!match) return <span className={cn("tabular", className)}>{text}</span>;
  const [, sign, symbol, digits] = match;
  return (
    <span className={cn("tabular inline-flex items-baseline", className)} aria-label={text}>
      {sign}
      <span className="mr-0.5 text-[0.55em] font-medium opacity-70">{symbol}</span>
      {digits}
    </span>
  );
}
