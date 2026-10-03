import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { CoupleSpace, Membership, User, type ICoupleSpace, type IUser } from "@/models";
import type { MemberDTO } from "@/types/domain";

export interface MemberContext {
  user: IUser;
  userId: string;
  userOid: Types.ObjectId;
  space: ICoupleSpace;
  spaceId: string;
  spaceOid: Types.ObjectId;
  role: "OWNER" | "PARTNER";
  members: MemberDTO[];
  partner: MemberDTO | null;
  me: MemberDTO;
}

/** Resolves the signed-in user from the session, verified against the DB. */
export const getCurrentUser = cache(async (): Promise<IUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const user = await User.findById(id).lean<IUser>();
  if (!user) return null;
  // Sessions issued before a password change are rejected.
  if ((session.sv ?? 0) !== (user.sessionVersion ?? 0)) return null;
  return user;
});

/**
 * Resolves the couple space for the signed-in user. Membership is always
 * derived server-side from the session; client-supplied space ids are never
 * trusted.
 */
export const getMemberContext = cache(async (): Promise<MemberContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  return loadMemberContext(user);
});

/** Builds the member context for a known user (also used by verified webhooks). */
export async function loadMemberContext(user: IUser): Promise<MemberContext | null> {
  await connectDB();
  const membership = await Membership.findOne({ userId: user._id }).lean();
  if (!membership) return null;
  const [space, memberships] = await Promise.all([
    CoupleSpace.findById(membership.coupleSpaceId).lean<ICoupleSpace>(),
    Membership.find({ coupleSpaceId: membership.coupleSpaceId }).sort({ joinedAt: 1 }).lean(),
  ]);
  if (!space) return null;

  const users = await User.find({ _id: { $in: memberships.map((m) => m.userId) } }).lean<IUser[]>();
  const members: MemberDTO[] = memberships
    .map((m) => {
      const u = users.find((x) => x._id.equals(m.userId));
      if (!u) return null;
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
        avatarUrl: u.avatarUrl ?? null,
        role: m.role,
        isMe: u._id.equals(user._id),
      } satisfies MemberDTO;
    })
    .filter((m): m is MemberDTO => m !== null);

  const me = members.find((m) => m.isMe)!;
  return {
    user,
    userId: user._id.toString(),
    userOid: user._id,
    space,
    spaceId: space._id.toString(),
    spaceOid: space._id,
    role: membership.role,
    members,
    partner: members.find((m) => !m.isMe) ?? null,
    me,
  };
}

/** For pages: redirects to login when signed out. */
export async function requireUserPage(): Promise<IUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirects to login / onboarding as needed. */
export async function requireMemberPage(): Promise<MemberContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ctx = await getMemberContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireUser(): Promise<IUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Please sign in again.");
  return user;
}

export async function requireMember(): Promise<MemberContext> {
  await requireUser();
  const ctx = await getMemberContext();
  if (!ctx) throw new AppError("FORBIDDEN", "Create or join a couple space first.");
  return ctx;
}

/** Parses an id from the client, rejecting malformed values early. */
export function parseObjectId(id: unknown, what = "Item"): Types.ObjectId {
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    throw new AppError("NOT_FOUND", `${what} not found.`);
  }
  return new Types.ObjectId(id);
}
