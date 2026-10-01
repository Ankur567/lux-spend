import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { Activity, type IActivity } from "@/models";
import type { ActivityType } from "@/types/domain";
import { toActivityDTO } from "./mappers";

type ActorContext = Pick<MemberContext, "spaceOid" | "userOid">;

export async function logActivity(
  ctx: ActorContext,
  type: ActivityType,
  data: Record<string, string | number | null> = {},
  opts: { wishlistItemId?: Types.ObjectId | null; session?: ClientSession | null; system?: boolean } = {},
): Promise<void> {
  await Activity.create(
    [
      {
        coupleSpaceId: ctx.spaceOid,
        actorId: opts.system ? null : ctx.userOid,
        type,
        data,
        wishlistItemId: opts.wishlistItemId ?? null,
      },
    ],
    { session: opts.session ?? null },
  );
}

export async function listActivity(ctx: MemberContext, limit = 20) {
  const rows = await Activity.find({ coupleSpaceId: ctx.spaceOid }).sort({ createdAt: -1 }).limit(limit).lean<IActivity[]>();
  return rows.map(toActivityDTO);
}
