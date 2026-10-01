import "server-only";
import { serverEnv } from "@/lib/env";
import { AccountAggregatorProvider } from "./account-aggregator-provider";
import { ManualBankProvider } from "./manual-provider";
import type { BankDataProvider, BankProviderStatus } from "./types";

export function getBankProvider(): BankDataProvider {
  const name = serverEnv.aaProvider();
  const id = serverEnv.aaClientId();
  const secret = serverEnv.aaClientSecret();
  if (name && id && secret) return new AccountAggregatorProvider(name, id, secret);
  return new ManualBankProvider();
}

/** Safe-to-render status (no secrets). */
export function getBankProviderStatus(): BankProviderStatus {
  const provider = getBankProvider();
  return {
    id: provider.id,
    displayName: provider.displayName,
    configured: provider.configured,
    message: provider.configured
      ? `${provider.displayName} credentials are configured. Consent flow must be completed with your AA provider before accounts appear.`
      : "Bank sync is not configured.",
  };
}

export type { BankDataProvider, BankProviderStatus } from "./types";
