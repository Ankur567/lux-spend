import { PageHeader, SectionTitle } from "@/components/page-header";
import { LabelListEditor } from "@/components/settings/settings-forms";
import { requireMemberPage } from "@/lib/auth/guard";
import { getSettings } from "@/lib/services/settings-service";

export const metadata = { title: "Categories & payment methods" };

export default async function ListsSettingsPage() {
  const ctx = await requireMemberPage();
  const s = await getSettings(ctx.spaceOid);
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Lists" backHref="/settings" />
      <SectionTitle className="mt-2">Categories</SectionTitle>
      <LabelListEditor kind="categories" initial={s.categories} />
      <SectionTitle>Payment methods</SectionTitle>
      <LabelListEditor kind="paymentMethods" initial={s.paymentMethods} />
    </div>
  );
}
