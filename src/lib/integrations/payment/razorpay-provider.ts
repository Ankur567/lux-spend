import "server-only";
import crypto from "node:crypto";
import { AppError } from "@/lib/errors";
import type { CreatePaymentParams, CreatedPayment, PaymentProvider, PaymentStatus, VerifiedPayment, WebhookResult } from "./types";

const API = "https://api.razorpay.com/v1";

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function mapStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "captured":
      return "CAPTURED";
    case "authorized":
    case "created":
      return "PENDING";
    case "failed":
      return "FAILED";
    default:
      return "UNKNOWN";
  }
}

interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
}

/**
 * Razorpay Orders + Checkout (supports UPI, cards, netbanking).
 * Activated only when OPTIONAL_PAYMENT_PROVIDER=razorpay and the key id,
 * key secret and webhook secret are all configured.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly id = "razorpay";
  readonly displayName = "Razorpay";
  readonly configured: boolean;

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string,
  ) {
    this.configured = Boolean(keyId && keySecret && webhookSecret);
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[razorpay] API error", res.status, await res.text().catch(() => ""));
      throw new AppError("BAD_REQUEST", "The payment provider rejected the request.");
    }
    return (await res.json()) as T;
  }

  async createPayment(p: CreatePaymentParams): Promise<CreatedPayment> {
    const order = await this.api<RazorpayOrder>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: p.amount,
        currency: p.currency,
        receipt: p.receipt.slice(0, 40),
        notes: { coupleSpaceId: p.coupleSpaceId, userId: p.userId },
      }),
    });
    return {
      providerOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      checkout: { key: this.keyId, order_id: order.id, amount: order.amount, currency: order.currency },
    };
  }

  private async toVerified(payment: RazorpayPayment): Promise<VerifiedPayment> {
    let notes = payment.notes ?? {};
    if ((!notes.coupleSpaceId || !notes.userId) && payment.order_id) {
      const order = await this.api<RazorpayOrder>(`/orders/${encodeURIComponent(payment.order_id)}`);
      notes = { ...order.notes, ...notes };
    }
    return {
      providerPaymentId: payment.id,
      providerOrderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: mapStatus(payment.status),
      coupleSpaceId: notes.coupleSpaceId ?? null,
      userId: notes.userId ?? null,
    };
  }

  async verifyPayment(params: Record<string, string>): Promise<VerifiedPayment> {
    const orderId = params.razorpay_order_id;
    const paymentId = params.razorpay_payment_id;
    const signature = params.razorpay_signature;
    if (!orderId || !paymentId || !signature) throw new AppError("BAD_REQUEST", "Missing payment confirmation details.");
    const expected = crypto.createHmac("sha256", this.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    if (!safeEqualHex(expected, signature)) throw new AppError("FORBIDDEN", "Payment signature verification failed.");
    const verified = await this.getPaymentStatus(paymentId);
    if (verified.providerOrderId !== orderId) throw new AppError("FORBIDDEN", "Payment does not match the order.");
    return verified;
  }

  async handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    const signature = headers.get("x-razorpay-signature") ?? "";
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    if (!signature || !safeEqualHex(expected, signature)) {
      throw new AppError("FORBIDDEN", "Invalid webhook signature.");
    }
    const body = JSON.parse(rawBody) as { event: string; payload?: { payment?: { entity?: RazorpayPayment } } };
    const entity = body.payload?.payment?.entity;
    if (!entity || (body.event !== "payment.captured" && body.event !== "order.paid")) {
      return { credit: false, payment: null, event: body.event };
    }
    const payment = await this.toVerified(entity);
    return { credit: payment.status === "CAPTURED", payment, event: body.event };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<VerifiedPayment> {
    const payment = await this.api<RazorpayPayment>(`/payments/${encodeURIComponent(providerPaymentId)}`);
    return this.toVerified(payment);
  }
}
