/**
 * Read-only bank data access (e.g. India's Account Aggregator framework).
 * Bank data providers can only READ accounts/transactions with user consent;
 * they never move money. Synced transactions are suggestions the couple can
 * import into the ledger, never automatic deposits.
 */
export interface BankAccount {
  id: string;
  institution: string;
  maskedNumber: string;
  type: "SAVINGS" | "CURRENT" | "CREDIT_CARD" | "OTHER";
}

export interface BankTransaction {
  id: string;
  accountId: string;
  /** Integer minor units. */
  amount: number;
  direction: "CREDIT" | "DEBIT";
  narration: string;
  postedAt: string;
}

export interface BankConnectResult {
  /** URL to redirect the user to for consent, when the provider uses one. */
  redirectUrl?: string;
  consentId?: string;
}

export interface BankDataProvider {
  readonly id: string;
  readonly displayName: string;
  /** True only when real credentials are configured on the server. */
  readonly configured: boolean;
  connect(params: { userId: string; coupleSpaceId: string; returnUrl: string }): Promise<BankConnectResult>;
  disconnect(params: { consentId: string }): Promise<void>;
  getAccounts(params: { consentId: string }): Promise<BankAccount[]>;
  getTransactions(params: { consentId: string; accountId: string; from: Date; to: Date }): Promise<BankTransaction[]>;
  syncTransactions(params: { consentId: string; since: Date }): Promise<BankTransaction[]>;
}

export interface BankProviderStatus {
  id: string;
  displayName: string;
  configured: boolean;
  message: string;
}
