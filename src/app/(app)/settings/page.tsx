import { Download, Heart, KeyRound, Link2, ListChecks, PiggyBank, UserRound } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SettingsGroup, SettingsLink } from "@/components/settings/settings-link";
import { requireMemberPage } from "@/lib/auth/guard";
import { formatCurrency } from "@/lib/money";
import { getSettings } from "@/lib/services/settings-service";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireMemberPage();
  const settings = await getSettings(ctx.spaceOid);
  const currency = ctx.space.currency;
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Settings" backHref="/profile" />

      <SectionTitle className="mt-2">Space</SectionTitle>
      <SettingsGroup>
        <SettingsLink href="/settings/couple" icon={<Heart className="size-4" />} label="Couple space" detail={`${ctx.space.name} · ${currency}`} />
        <SettingsLink
          href="/settings/budget"
          icon={<PiggyBank className="size-4" />}
          label="Budget, goals & funding order"
          detail={settings.monthlyBudget ? `Budget ${formatCurrency(settings.monthlyBudget, { currency })}/month` : "No monthly budget set"}
        />
        <SettingsLink href="/settings/lists" icon={<ListChecks className="size-4" />} label="Categories & payment methods" />
        <SettingsLink href="/settings/integrations" icon={<Link2 className="size-4" />} label="Connected accounts" detail="Bank sync, online payments, UPI" />
      </SettingsGroup>

      <SectionTitle>Account</SectionTitle>
      <SettingsGroup>
        <SettingsLink href="/settings/profile" icon={<UserRound className="size-4" />} label="Profile" />
        <SettingsLink href="/settings/security" icon={<KeyRound className="size-4" />} label="Password & security" />
        <SettingsLink href="/settings/data" icon={<Download className="size-4" />} label="Export data" detail="CSV and JSON backup" />
      </SettingsGroup>
    </div>
  );
}
