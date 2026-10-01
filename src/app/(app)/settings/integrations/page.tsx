import { Building2, CreditCard, QrCode } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { requireMemberPage } from "@/lib/auth/guard";
import { getBankProviderStatus } from "@/lib/integrations/bank";
import { getPaymentProviderStatus } from "@/lib/integrations/payment";
import { fundUpi, isUpiConfigured } from "@/lib/public-config";

export const metadata = { title: "Connected accounts" };

export default async function IntegrationsPage() {
  await requireMemberPage();
  const bank = getBankProviderStatus();
  const payments = getPaymentProviderStatus();
  const onlinePayments = payments.configured && payments.id !== "manual";

  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Connected accounts" subtitle="Everything works without these. They only add convenience." backHref="/settings" />

      <div className="space-y-3">
        <IntegrationCard
          icon={<Building2 className="size-5" />}
          title="Bank sync"
          status={bank.configured ? "Credentials configured" : "Not configured"}
          active={bank.configured}
        >
          <p>{bank.message}</p>
          <p className="mt-2">
            Bank data providers (such as India&apos;s Account Aggregator network) can only read balances and transactions with your consent. They never move money.
            Until bank sync is set up, record contributions manually.
          </p>
        </IntegrationCard>

        <IntegrationCard
          icon={<CreditCard className="size-5" />}
          title="Online payments"
          status={onlinePayments ? `${payments.displayName} active` : "Not configured"}
          active={onlinePayments}
        >
          {onlinePayments ? (
            <p>
              Contributions can be paid online with {payments.displayName}. Money is only added to the fund after the payment is verified by signature on the server
              or confirmed by a signed webhook.
            </p>
          ) : (
            <p>
              Online payments are not configured. Add money by recording contributions manually. A server admin can enable Razorpay by setting the payment provider
              environment variables.
            </p>
          )}
        </IntegrationCard>

        <IntegrationCard icon={<QrCode className="size-5" />} title="UPI Pay to Fund" status={isUpiConfigured ? "Active" : "Not configured"} active={isUpiConfigured}>
          {isUpiConfigured ? (
            <p>
              Paying to <span className="font-mono">{fundUpi.id}</span> ({fundUpi.name}). Opening a UPI app doesn&apos;t confirm a payment, so each payment is recorded
              manually after you complete it.
            </p>
          ) : (
            <p>Set NEXT_PUBLIC_FUND_UPI_ID to show a UPI QR code and payment link for the fund account.</p>
          )}
        </IntegrationCard>
      </div>
    </div>
  );
}

function IntegrationCard({ icon, title, status, active, children }: { icon: ReactNode; title: string; status: string; active: boolean; children: ReactNode }) {
  return (
    <section className="surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-muted">{icon}</span>
        <h2 className="flex-1 font-medium">{title}</h2>
        <span className={active ? "rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success" : "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"}>
          {status}
        </span>
      </div>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
