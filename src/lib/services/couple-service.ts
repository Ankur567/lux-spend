import "server-only";
import { addDays } from "date-fns";
import type { MemberContext } from "@/lib/auth/guard";
import { createInviteCode } from "@/lib/auth/password";
import { withTransaction } from "@/lib/db/transaction";
import { AppError } from "@/lib/errors";
import { AppSettings, CoupleSpace, Invitation, MAX_MEMBERS, Membership, User, WishlistItem, type IInvitation, type IUser } from "@/models";
import { logActivity } from "./activity-service";
import { notify } from "./notification-service";

const INVITE_TTL_DAYS = 14;

export async function createSpace(user: IUser, name: string) {
  return withTransaction(async (session) => {
    const existing = await Membership.findOne({ userId: user._id }).session(session);
    if (existing) throw new AppError("CONFLICT", "You're already part of a couple space.");

    const [space] = await CoupleSpace.create([{ name, createdBy: user._id }], { session });
    await Membership.create([{ coupleSpaceId: space._id, userId: user._id, role: "OWNER" }], { session });
    await AppSettings.create([{ coupleSpaceId: space._id }], { session });
    await User.updateOne({ _id: user._id }, { $set: { coupleSpaceId: space._id } }, { session: session ?? undefined });
    await Invitation.create(
      [{ coupleSpaceId: space._id, code: createInviteCode(), invitedBy: user._id, expiresAt: addDays(new Date(), INVITE_TTL_DAYS) }],
      { session },
    );
    await logActivity({ spaceOid: space._id, userOid: user._id }, "SPACE_CREATED", { name }, { session });
    return space._id.toString();
  });
}

/** Current usable invite for the space (creates one if needed). Null once both partners joined. */
export async function getActiveInvite(ctx: MemberContext): Promise<IInvitation | null> {
  if (ctx.members.length >= MAX_MEMBERS) return null;
  const now = new Date();
  const existing = await Invitation.findOne({ coupleSpaceId: ctx.spaceOid, status: "PENDING", expiresAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .lean<IInvitation>();
  if (existing) return existing;
  const created = await Invitation.create({
    coupleSpaceId: ctx.spaceOid,
    code: createInviteCode(),
    invitedBy: ctx.userOid,
    expiresAt: addDays(now, INVITE_TTL_DAYS),
  });
  return created.toObject() as IInvitation;
}

export async function regenerateInvite(ctx: MemberContext): Promise<IInvitation | null> {
  if (ctx.members.length >= MAX_MEMBERS) return null;
  await Invitation.updateMany({ coupleSpaceId: ctx.spaceOid, status: "PENDING" }, { $set: { status: "REVOKED" } });
  return getActiveInvite(ctx);
}

export interface InvitePreview {
  valid: boolean;
  reason?: string;
  spaceName?: string;
  inviterName?: string;
}

export async function getInvitePreview(code: string): Promise<InvitePreview> {
  const invite = await Invitation.findOne({ code: code.toUpperCase() }).lean<IInvitation>();
  if (!invite) return { valid: false, reason: "This invite code doesn't exist." };
  if (invite.status !== "PENDING") return { valid: false, reason: "This invite has already been used or revoked." };
  if (invite.expiresAt < new Date()) return { valid: false, reason: "This invite has expired. Ask your partner for a new one." };
  const [space, inviter, count] = await Promise.all([
    CoupleSpace.findById(invite.coupleSpaceId).lean(),
    User.findById(invite.invitedBy).lean(),
    Membership.countDocuments({ coupleSpaceId: invite.coupleSpaceId }),
  ]);
  if (!space) return { valid: false, reason: "This couple space no longer exists." };
  if (count >= MAX_MEMBERS) return { valid: false, reason: "This couple space already has two members." };
  return { valid: true, spaceName: space.name, inviterName: inviter?.name ?? "Your partner" };
}

export async function joinWithCode(user: IUser, code: string) {
  const result = await withTransaction(async (session) => {
    const existing = await Membership.findOne({ userId: user._id }).session(session);
    if (existing) throw new AppError("CONFLICT", "You're already part of a couple space.");

    const invite = await Invitation.findOne({ code: code.toUpperCase() }).session(session);
    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      throw new AppError("NOT_FOUND", "That invite code is invalid or has expired.");
    }
    // Serialise joins on this space.
    await CoupleSpace.updateOne({ _id: invite.coupleSpaceId }, { $inc: { ledgerVersion: 1 } }, { session: session ?? undefined });
    const count = await Membership.countDocuments({ coupleSpaceId: invite.coupleSpaceId }).session(session);
    if (count >= MAX_MEMBERS) throw new AppError("CONFLICT", "This couple space already has two members.");

    await Membership.create([{ coupleSpaceId: invite.coupleSpaceId, userId: user._id, role: "PARTNER" }], { session });
    await User.updateOne({ _id: user._id }, { $set: { coupleSpaceId: invite.coupleSpaceId, onboardingCompleted: true } }, { session: session ?? undefined });
    invite.status = "ACCEPTED";
    invite.acceptedBy = user._id;
    invite.acceptedAt = new Date();
    await invite.save({ session });
    // Items created "for Partner" before the partner joined now belong to them.
    await WishlistItem.updateMany(
      { coupleSpaceId: invite.coupleSpaceId, ownerType: "INDIVIDUAL", ownerUserId: null },
      { $set: { ownerUserId: user._id } },
      { session: session ?? undefined },
    );
    await logActivity({ spaceOid: invite.coupleSpaceId, userOid: user._id }, "PARTNER_JOINED", { name: user.name }, { session });
    return { spaceOid: invite.coupleSpaceId };
  });

  await notify(
    { spaceOid: result.spaceOid, userOid: user._id },
    { type: "PARTNER_JOINED", title: `${user.name} joined your couple space 💞`, body: "You can now plan and save together.", link: "/", recipients: "PARTNER" },
  );
}

export async function completeOnboarding(userId: IUser["_id"]) {
  await User.updateOne({ _id: userId }, { $set: { onboardingCompleted: true } });
}
