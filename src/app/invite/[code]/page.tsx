import { Heart } from "lucide-react";
import Link from "next/link";
import { JoinInviteButton } from "@/components/onboarding/join-invite-button";
import { getCurrentUser, getMemberContext } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/connect";
import { APP_NAME } from "@/lib/public-config";
import { getInvitePreview } from "@/lib/services/couple-service";

export const metadata = { title: "You're invited" };

export default async function InvitePage({ params }: PageProps<"/invite/[code]">) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim().toUpperCase().slice(0, 20);
  await connectDB();
  const [preview, user] = await Promise.all([getInvitePreview(code), getCurrentUser()]);
  const ctx = user ? await getMemberContext() : null;

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10 text-center">
      <p className="font-display text-2xl">{APP_NAME}</p>
      <div className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-rose-soft text-rose">
        <Heart className="size-8" />
      </div>
      {!preview.valid ? (
        <>
          <h1 className="mt-6 font-display text-4xl">Invite unavailable</h1>
          <p className="mt-3 text-muted-foreground">{preview.reason}</p>
          <Link href={user ? "/" : "/login"} className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl border border-border font-medium">
            {user ? "Go home" : "Sign in"}
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-6 font-display text-4xl leading-tight">{preview.inviterName} invited you</h1>
          <p className="mt-3 text-muted-foreground">
            Join <span className="font-medium text-foreground">{preview.spaceName}</span>, a private luxury fund and shared wishlist for the two of you.
          </p>
          <div className="mt-8 space-y-2">
            {!user ? (
              <>
                <Link href={`/register?invite=${encodeURIComponent(code)}`} className="flex h-12 items-center justify-center rounded-2xl bg-primary font-medium text-primary-foreground">
                  Create account & join
                </Link>
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`} className="flex h-12 items-center justify-center rounded-2xl border border-border font-medium">
                  I already have an account
                </Link>
              </>
            ) : ctx ? (
              <>
                <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">You&apos;re already part of {ctx.space.name}. Each account can belong to one couple space.</p>
                <Link href="/" className="flex h-12 items-center justify-center rounded-2xl border border-border font-medium">
                  Go home
                </Link>
              </>
            ) : (
              <JoinInviteButton code={code} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
