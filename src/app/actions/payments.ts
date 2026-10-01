"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { revalidateApp } from "@/lib/actions/revalidate";
import { requireMember } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/integrations/payment";
import { recordContribution } from "@/lib/services/transaction-service";
import { todayInput } from "@/lib/time";
import { money } from "@/lib/validators/common";

export async function createOnlinePaymentAction(raw: unknown): Promise<ActionResult<{ checkout: Record<string, string | number> }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { amount } = z.object({ amount: money }).parse(raw);
    const provider = getPaymentProvider();
    if (!provider.configured) throw new AppError("NOT_CONFIGURED", "Online payments are not configured.");
    const payment = await provider.createPayment({
      amount,
      currency: ctx.space.currency,
      coupleSpaceId: ctx.spaceId,
      userId: ctx.userId,
      receipt: `fund_${ctx.spaceId.slice(-6)}_${Date.now()}`,
    });
    return { checkout: { ...payment.checkout, name: ctx.space.name, prefill_email: ctx.user.email, prefill_name: ctx.user.name } };
  });
}

/**
 * Client checkout callback. The signature is verified server-side and the
 * payment re-fetched from the provider; only CAPTURED payments are credited.
 * The provider payment id is the idempotency key, shared with the webhook, so
 * the same payment can never be credited twice.
 */
export async function confirmOnlinePaymentAction(raw: unknown): Promise<ActionResult<{ credited: boolean }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const params = z.record(z.string(), z.string().max(200)).parse(raw);
    const provider = getPaymentProvider();
    if (!provider.configured) throw new AppError("NOT_CONFIGURED", "Online payments are not configured.");
    const payment = await provider.verifyPayment(params);
    if (payment.coupleSpaceId !== ctx.spaceId || payment.userId !== ctx.userId) {
      throw new AppError("FORBIDDEN", "This payment belongs to a different account.");
    }
    if (payment.status !== "CAPTURED") return { credited: false };
    await recordContribution(ctx, {
      amount: payment.amount,
      userId: ctx.userId,
      date: todayInput(),
      paymentMethod: "UPI",
      notes: `Paid online via ${provider.displayName}`,
      allocation: "KEEP",
      source: "PROVIDER",
      idempotencyKey: `${provider.id}:${payment.providerPaymentId}`,
      metadata: { provider: provider.id, providerPaymentId: payment.providerPaymentId, providerOrderId: payment.providerOrderId },
    });
    revalidateApp();
    return { credited: true };
  });
}
