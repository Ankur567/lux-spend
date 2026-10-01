import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/settings/settings-forms";
import { requireMemberPage } from "@/lib/auth/guard";

export const metadata = { title: "Password & security" };

export default async function SecuritySettingsPage() {
  await requireMemberPage();
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Security" backHref="/settings" />
      <ChangePasswordForm />
    </div>
  );
}
