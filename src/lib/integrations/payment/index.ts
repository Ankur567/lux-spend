import "server-only";
import { serverEnv } from "@/lib/env";
import { ManualPaymentProvider } from "./manual-provider";
import { RazorpayPaymentProvider } from "./razorpay-provider";
import type { PaymentProvider } from "./types";

/**
 * Returns the active payment provider. Real providers are only activated when
 * every required server-side secret is present; otherwise the manual provider
 * is used and the app works exactly the same with manual contributions.
 */
export function getPaymentProvider(): PaymentProvider {
  const name = serverEnv.paymentProvider();
  const clientId = serverEnv.paymentClientId();
  const secret = serverEnv.paymentClientSecret();
  const webhookSecret = serverEnv.paymentWebhookSecret();

  if (name === "razorpay" && clientId && secret && webhookSecret) {
    return new RazorpayPaymentProvider(clientId, secret, webhookSecret);
  }
  return new ManualPaymentProvider();
}

export function getPaymentProviderStatus() {
  const provider = getPaymentProvider();
  return { id: provider.id, displayName: provider.displayName, configured: provider.configured };
}

export type { PaymentProvider } from "./types";
