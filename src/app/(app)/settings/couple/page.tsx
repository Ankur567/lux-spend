import { PageHeader, SectionTitle } from "@/components/page-header";
import { InviteCard, SpaceForm } from "@/components/settings/settings-forms";
import { UserAvatar } from "@/components/user-avatar";
import { requireMemberPage } from "@/lib/auth/guard";
import { getActiveInvite } from "@/lib/services/couple-service";
import { Transaction } from "@/models";

export const metadata = { title: "Couple space" };

export default async function CoupleSettingsPage() {
  const ctx = await requireMemberPage();
  const [invite, hasTransactions] = await Promise.all([getActiveInvite(ctx), Transaction.exists({ coupleSpaceId: ctx.spaceOid })]);

  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Couple space" backHref="/settings" />

      <SectionTitle className="mt-2">Members</SectionTitle>
      <ul className="surface divide-y divide-border/60">
        {ctx.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <UserAvatar name={m.name} color={m.avatarColor} imageUrl={m.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name}
                {m.isMe ? " (you)" : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{m.role === "OWNER" ? "Creator" : "Partner"}</span>
          </li>
        ))}
      </ul>

      {invite ? (
        <div className="mt-4">
          <InviteCard code={invite.code} />
        </div>
      ) : null}

      <SectionTitle>Details</SectionTitle>
      <SpaceForm name={ctx.space.name} currency={ctx.space.currency} hasTransactions={!!hasTransactions} />
    </div>
  );
}
