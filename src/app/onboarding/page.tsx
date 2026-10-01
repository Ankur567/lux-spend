import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getMemberContext, requireUserPage } from "@/lib/auth/guard";
import { getActiveInvite } from "@/lib/services/couple-service";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUserPage();
  const ctx = await getMemberContext();
  if (ctx && user.onboardingCompleted) redirect("/");
  const invite = ctx ? await getActiveInvite(ctx) : null;

  return (
    <OnboardingFlow
      userName={user.name.split(" ")[0]}
      userId={user._id.toString()}
      hasSpace={!!ctx}
      spaceName={ctx?.space.name ?? null}
      partnerName={ctx?.partner?.name ?? null}
      inviteCode={invite?.code ?? null}
      currency={ctx?.space.currency ?? "INR"}
      initialStep={ctx ? "invite" : "welcome"}
    />
  );
}
