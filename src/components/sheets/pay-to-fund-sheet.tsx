"use client";

import { Copy, ExternalLink, Info } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { Field, MoneyInput } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { fromPaise, toPaise } from "@/lib/money";

/**
 * Convenience only: shows the fund's UPI ID / QR / deep link. Opening a UPI
 * app proves nothing, so the contribution must still be confirmed manually.
 */
export function PayToFundSheetBody() {
  const app = useApp();
  const upi = app.upi!;
  const [amount, setAmount] = useState("");
  const [qr, setQr] = useState<string | null>(null);

  const link = useMemo(() => {
    const params = new URLSearchParams({ pa: upi.id, pn: upi.name, cu: "INR", tn: `${app.space.name} fund` });
    try {
      const p = amount ? toPaise(amount) : 0;
      if (p > 0) params.set("am", fromPaise(p).toFixed(2));
    } catch {
      /* ignore invalid amount */
    }
    return `upi://pay?${params.toString()}`;
  }, [upi, amount, app.space.name]);

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link]);

  return (
    <div className="space-y-5">
      <Field label="Amount (optional)" htmlFor="u-amount">
        <MoneyInput id="u-amount" currency="INR" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="surface flex flex-col items-center rounded-3xl p-5">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`UPI QR code for ${upi.id}`} className="size-56 rounded-2xl bg-white p-2" />
        ) : (
          <div className="size-56 animate-pulse rounded-2xl bg-muted" />
        )}
        <p className="mt-3 text-sm text-muted-foreground">{upi.name}</p>
        <button
          type="button"
          className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-mono text-sm"
          onClick={() => navigator.clipboard.writeText(upi.id).then(() => toast.success("UPI ID copied"))}
        >
          {upi.id} <Copy className="size-4" />
        </button>
      </div>
      <a
        href={link}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-foreground md:hidden"
      >
        Open UPI app <ExternalLink className="size-4" />
      </a>
      <div className="flex gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>After paying, record it below. Opening a UPI app doesn&apos;t confirm a payment, so nothing is added until you confirm.</p>
      </div>
      <Button
        variant="outline"
        className="h-12 w-full rounded-2xl text-base"
        onClick={() => app.openSheet({ kind: "contribution", prefill: { amount, paymentMethod: "UPI" } })}
      >
        I&apos;ve paid — record contribution
      </Button>
    </div>
  );
}
