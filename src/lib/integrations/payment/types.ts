/**
 * Online payment collection. A provider creates a payment (order) that the
 * user pays in the provider's checkout; the money is only credited to the
 * ledger after a server-side signature check (client callback) or a verified
 * webhook, both keyed by the provider payment id for idempotency.
 */
export type PaymentStatus = "CREATED" | "PENDING" | "CAPTURED" | "FAILED" | "UNKNOWN";

export interface CreatePaymentParams {
  /** Integer minor units. */
  amount: number;
  currency: string;
  coupleSpaceId: string;
  userId: string;
  receipt: string;
}

export interface CreatedPayment {
  providerOrderId: string;
  amount: number;
  currency: string;
  /** Public data the client checkout needs (never secrets). */
  checkout: Record<string, string | number>;
}

export interface VerifiedPayment {
  providerPaymentId: string;
  providerOrderId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  coupleSpaceId: string | null;
  userId: string | null;
}

export interface WebhookResult {
  /** True when the event is a confirmed, captured payment that should be credited. */
  credit: boolean;
  payment: VerifiedPayment | null;
  event: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  readonly configured: boolean;
  createPayment(params: CreatePaymentParams): Promise<CreatedPayment>;
  /** Verifies a client-side completion callback (signature check + status fetch). */
  verifyPayment(params: Record<string, string>): Promise<VerifiedPayment>;
  /** Verifies the raw webhook body signature and parses the event. */
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
  getPaymentStatus(providerPaymentId: string): Promise<VerifiedPayment>;
}
