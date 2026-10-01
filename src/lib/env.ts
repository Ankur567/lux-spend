import "server-only";

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const serverEnv = {
  get mongodbUri(): string {
    const uri = optional("MONGODB_URI");
    if (!uri) {
      throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and configure it.");
    }
    return uri;
  },
  paymentProvider: () => optional("OPTIONAL_PAYMENT_PROVIDER")?.toLowerCase(),
  paymentClientId: () => optional("PAYMENT_PROVIDER_CLIENT_ID"),
  paymentClientSecret: () => optional("PAYMENT_PROVIDER_CLIENT_SECRET"),
  paymentWebhookSecret: () => optional("PAYMENT_PROVIDER_WEBHOOK_SECRET"),
  aaProvider: () => optional("OPTIONAL_AA_PROVIDER")?.toLowerCase(),
  aaClientId: () => optional("AA_CLIENT_ID"),
  aaClientSecret: () => optional("AA_CLIENT_SECRET"),
  appUrl: () => optional("NEXT_PUBLIC_APP_URL") ?? optional("NEXTAUTH_URL") ?? "http://localhost:3000",
  isProduction: () => process.env.NODE_ENV === "production",
};
