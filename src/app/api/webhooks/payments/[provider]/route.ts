import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { loadMemberContext } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/integrations/payment";
import { rateLimiter, RATE_LIMITS } from "@/lib/rate-limit";
import { recordContribution } from "@/lib/services/transaction-service";
import { todayInput } from "@/lib/time";
import { User, type IUser } from "@/models";

export const dynamic = "force-dynamic";

/**
 * Payment provider webhook. The raw body signature is verified before
 * anything is parsed or trusted; payments are credited idempotently using the
 * provider payment id, so retries and the client callback can't double-count.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/webhooks/payments/[provider]">) {
  const { provider: providerId } = await ctx.params;
  const provider = getPaymentProvider();
  if (!provider.configured || provider.id !== providerId) {
    return NextResponse.json({ error: "Payment provider not configured" }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { limit, windowMs } = RATE_LIMITS.webhook;
  if (!(await rateLimiter.hit(`webhook:${ip}`, limit, windowMs)).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  try {
    const result = await provider.handleWebhook(rawBody, req.headers);
    if (!result.credit || !result.payment) return NextResponse.json({ ok: true, ignored: result.event });

    const { payment } = result;
    if (!payment.userId || !payment.coupleSpaceId || !Types.ObjectId.isValid(payment.userId)) {
      console.warn("[webhook] captured payment without space/user notes", payment.providerPaymentId);
      return NextResponse.json({ ok: true, ignored: "missing-notes" });
    }

    await connectDB();
    const user = await User.findById(payment.userId).lean<IUser>();
    const member = user ? await loadMemberContext(user) : null;
    if (!member || member.spaceId !== payment.coupleSpaceId) {
      console.warn("[webhook] payment references unknown member/space", payment.providerPaymentId);
      return NextResponse.json({ ok: true, ignored: "unknown-member" });
    }

    await recordContribution(member, {
      amount: payment.amount,
      userId: member.userId,
      date: todayInput(),
      paymentMethod: "UPI",
      notes: `Paid online via ${provider.displayName}`,
      allocation: "KEEP",
      source: "PROVIDER",
      idempotencyKey: `${provider.id}:${payment.providerPaymentId}`,
      metadata: { provider: provider.id, providerPaymentId: payment.providerPaymentId, providerOrderId: payment.providerOrderId, via: "webhook" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.error("[webhook] processing failed", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
