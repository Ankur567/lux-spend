import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Link missing</h1>
        <p className="text-sm text-muted-foreground">This reset link is incomplete. Request a new one.</p>
        <Link href="/forgot-password" className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-medium text-primary-foreground">
          Request new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
