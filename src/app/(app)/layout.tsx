import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireMemberPage } from "@/lib/auth/guard";
import { buildAppData } from "@/lib/services/app-data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireMemberPage();
  if (!ctx.user.onboardingCompleted) redirect("/onboarding");
  const data = await buildAppData(ctx);
  return <AppShell data={data}>{children}</AppShell>;
}
