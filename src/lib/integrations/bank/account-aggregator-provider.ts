import "server-only";
import { AppError } from "@/lib/errors";
import type { BankAccount, BankConnectResult, BankDataProvider, BankTransaction } from "./types";

/**
 * Account Aggregator (RBI AA framework) adapter boundary.
 *
 * Real AA access requires the deployment to be onboarded as a Financial
 * Information User (FIU) with an AA / technology service provider (e.g. Setu,
 * Finvu, OneMoney, Anumati), signed consent artefacts and FI data decryption.
 * This class is the integration seam: it only activates when credentials are
 * present, and every method fails loudly until the provider-specific calls are
 * implemented against that provider's sandbox. It never returns fake data.
 */
export class AccountAggregatorProvider implements BankDataProvider {
  readonly id: string;
  readonly displayName: string;
  readonly configured: boolean;

  constructor(
    providerName: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    this.id = `aa:${providerName}`;
    this.displayName = `Account Aggregator (${providerName})`;
    this.configured = Boolean(clientId && clientSecret);
  }

  private pending(operation: string): never {
    throw new AppError(
      "NOT_CONFIGURED",
      `Account Aggregator ${operation} isn't available yet: the provider-specific consent and FI fetch flow must be implemented for ${this.displayName}.`,
    );
  }

  async connect(): Promise<BankConnectResult> {
    return this.pending("consent");
  }
  async disconnect(): Promise<void> {
    return this.pending("consent revocation");
  }
  async getAccounts(): Promise<BankAccount[]> {
    return this.pending("account discovery");
  }
  async getTransactions(): Promise<BankTransaction[]> {
    return this.pending("transaction fetch");
  }
  async syncTransactions(): Promise<BankTransaction[]> {
    return this.pending("sync");
  }
}
