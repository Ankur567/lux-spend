import "server-only";
import { AppError } from "@/lib/errors";
import type { BankDataProvider } from "./types";

/**
 * Default provider: no bank connectivity. The couple records contributions
 * and expenses manually; nothing is fetched from any bank.
 */
export class ManualBankProvider implements BankDataProvider {
  readonly id = "manual";
  readonly displayName = "Manual entry";
  readonly configured = false;

  private notConfigured(): never {
    throw new AppError("NOT_CONFIGURED", "Bank sync is not configured.");
  }

  async connect() {
    return this.notConfigured();
  }
  async disconnect() {
    return this.notConfigured();
  }
  async getAccounts() {
    return this.notConfigured();
  }
  async getTransactions() {
    return this.notConfigured();
  }
  async syncTransactions() {
    return this.notConfigured();
  }
}
