import { RegisterForm } from "@/components/auth/auth-forms";
import { connectDB } from "@/lib/db/connect";
import { getInvitePreview } from "@/lib/services/couple-service";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const raw = typeof sp.invite === "string" ? sp.invite.trim().slice(0, 20) : undefined;
  let inviterName: string | undefined;
  let inviteCode: string | undefined;
  if (raw) {
    await connectDB();
    const preview = await getInvitePreview(raw);
    if (preview.valid) {
      inviteCode = raw.toUpperCase();
      inviterName = preview.inviterName;
    }
  }
  return <RegisterForm inviteCode={inviteCode} inviterName={inviterName} />;
}
