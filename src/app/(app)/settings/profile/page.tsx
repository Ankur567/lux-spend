import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/settings/settings-forms";
import { requireMemberPage } from "@/lib/auth/guard";

export const metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const ctx = await requireMemberPage();
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Profile" subtitle={ctx.me.email} backHref="/settings" />
      <ProfileForm name={ctx.me.name} avatarColor={ctx.me.avatarColor} avatarUrl={ctx.me.avatarUrl} />
    </div>
  );
}
