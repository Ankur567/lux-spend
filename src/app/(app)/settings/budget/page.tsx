import { PageHeader } from "@/components/page-header";
import { BudgetForm } from "@/components/settings/settings-forms";
import { requireMemberPage } from "@/lib/auth/guard";
import { paiseToInput } from "@/lib/money";
import { getSettings } from "@/lib/services/settings-service";

export const metadata = { title: "Budget & goals" };

export default async function BudgetSettingsPage() {
  const ctx = await requireMemberPage();
  const s = await getSettings(ctx.spaceOid);
  const input = (v: number) => (v ? paiseToInput(v) : "");
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Budget & goals" backHref="/settings" />
      <BudgetForm
        currency={ctx.space.currency}
        initial={{
          monthlyBudget: input(s.monthlyBudget),
          savingsTarget: input(s.savingsTarget),
          expectedMonthlyContribution: input(s.expectedMonthlyContribution),
          strictBudget: s.strictBudget,
          orderingMode: s.orderingMode,
        }}
      />
    </div>
  );
}
