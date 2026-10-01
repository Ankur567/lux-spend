"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { confirmOnlinePaymentAction, createOnlinePaymentAction } from "@/app/actions/payments";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load checkout"));
    document.body.appendChild(s);
  });
}

/**
 * Only rendered when a payment provider is configured on the server. The
 * contribution is credited only after server-side signature verification
 * (or the provider webhook), never just because checkout opened.
 */
export function OnlinePayButton({ amount }: { amount: string }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!amount) {
      toast.error("Enter an amount first.");
      return;
    }
    setBusy(true);
    const created = await createOnlinePaymentAction({ amount });
    if (!created.ok) {
      setBusy(false);
      toast.error(created.error);
      return;
    }
    try {
      await loadCheckout();
    } catch {
      setBusy(false);
      toast.error("Couldn't open the payment window.");
      return;
    }
    const { prefill_email, prefill_name, ...checkout } = created.data.checkout;
    const rz = new window.Razorpay!({
      ...checkout,
      description: "Luxury fund contribution",
      prefill: { email: prefill_email, name: prefill_name },
      theme: { color: "#2b2420" },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (response: Record<string, string>) => {
        const res = await confirmOnlinePaymentAction(response);
        setBusy(false);
        if (!res.ok) return toast.error(res.error);
        if (res.data.credited) {
          toast.success("Payment received and added to your fund 🎉");
          app.closeSheet();
        } else {
          toast.info("Payment is processing. It will appear once the provider confirms it.");
        }
      },
    });
    rz.open();
  }

  return (
    <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={pay} disabled={busy}>
      <CreditCard className="size-4" /> {busy ? "Opening…" : `Pay online`}
    </Button>
  );
}
