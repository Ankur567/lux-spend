import { Activity, Bell, ChartPie, Download, Heart, LogOut, Settings, UserRound } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { CurrencyAmount } from "@/components/currency-amount";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { ThemePicker } from "@/components/settings/settings-forms";
import { SettingsGroup, SettingsLink } from "@/components/settings/settings-link";
import { UserAvatar } from "@/components/user-avatar";
import { requireMemberPage } from "@/lib/auth/guard";
import { formatTargetDate } from "@/lib/format";
import { getMemberTotals } from "@/lib/services/wallet-service";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const ctx = await requireMemberPage();
  const totals = await getMemberTotals(ctx);
  const together = Object.values(totals).reduce((a, t) => a + t.contributed, 0);

  return (
    <div className="pt-6 md:pt-8">
      <PageHeader title="Profile" />

      <section className="surface flex flex-col items-center p-6 text-center">
        <div className="flex">
          <UserAvatar name={ctx.me.name} color={ctx.me.avatarColor} imageUrl={ctx.me.avatarUrl} size="lg" />
          {ctx.partner ? <UserAvatar name={ctx.partner.name} color={ctx.partner.avatarColor} imageUrl={ctx.partner.avatarUrl} size="lg" className="-ml-4" /> : null}
        </div>
        <h2 className="mt-3 font-display text-3xl">
          {ctx.me.name}
          {ctx.partner ? ` & ${ctx.partner.name}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground">{ctx.space.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">Together since {formatTargetDate(new Date(ctx.space.createdAt).toISOString(), "long")}</p>
        {together > 0 ? (
          <p className="mt-4 rounded-full bg-rose-soft px-4 py-1.5 text-sm">
            <CurrencyAmount paise={together} currency={ctx.space.currency} className="font-semibold" /> saved together
          </p>
        ) : null}
      </section>

      <SectionTitle>Appearance</SectionTitle>
      <ThemePicker />

      <SectionTitle>Your space</SectionTitle>
      <SettingsGroup>
        <SettingsLink href="/insights" icon={<ChartPie className="size-4" />} label="Insights" detail="Trends, forecast and spending" />
        <SettingsLink href="/notifications" icon={<Bell className="size-4" />} label="Notifications" />
        <SettingsLink href="/activity" icon={<Activity className="size-4" />} label="Activity" />
        <SettingsLink href="/settings/couple" icon={<Heart className="size-4" />} label="Couple space" detail={ctx.partner ? `With ${ctx.partner.name}` : "Invite your partner"} />
      </SettingsGroup>

      <SectionTitle>Account</SectionTitle>
      <SettingsGroup>
        <SettingsLink href="/settings/profile" icon={<UserRound className="size-4" />} label="Edit profile" detail={ctx.me.email} />
        <SettingsLink href="/settings" icon={<Settings className="size-4" />} label="Settings" />
        <SettingsLink href="/settings/data" icon={<Download className="size-4" />} label="Export data" />
      </SettingsGroup>

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm font-medium text-destructive">
          <LogOut className="size-4" /> Sign out
        </button>
      </form>
    </div>
  );
}
