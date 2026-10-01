"use client";

import { useRouter } from "next/navigation";
import { joinSpaceAction } from "@/app/actions/couple";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";

export function JoinInviteButton({ code }: { code: string }) {
  const router = useRouter();
  const { run, pending } = useAction(joinSpaceAction);
  return (
    <Button
      className="h-12 w-full rounded-2xl text-base"
      disabled={pending}
      onClick={async () => {
        const res = await run({ code });
        if (res.ok) {
          router.replace("/");
          router.refresh();
        }
      }}
    >
      {pending ? "Joining…" : "Join couple space"}
    </Button>
  );
}
