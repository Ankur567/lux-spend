import "server-only";
import { AppError } from "@/lib/errors";
import type { PaymentProvider } from "./types";

/**
 * Default: no online collection. Money is transferred outside the app (UPI,
 * bank transfer, cash) and recorded manually as a contribution.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly id = "manual";
  readonly displayName = "Manual contributions";
  readonly configured = false;

  private notConfigured(): never {
    throw new AppError("NOT_CONFIGURED", "Online payments are not configured. Record contributions manually.");
  }

  async createPayment() {
    return this.notConfigured();
  }
  async verifyPayment() {
    return this.notConfigured();
  }
  async handleWebhook() {
    return this.notConfigured();
  }
  async getPaymentStatus() {
    return this.notConfigured();
  }
}
