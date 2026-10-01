import "server-only";
import { addHours } from "date-fns";
import { createToken, hashPassword, sha256, verifyPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db/connect";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getEmailSender } from "@/lib/integrations/email";
import { PasswordResetToken, User, pickAvatarColor, type IUser } from "@/models";

export async function registerUser(input: { name: string; email: string; password: string }): Promise<IUser> {
  await connectDB();
  const exists = await User.exists({ email: input.email });
  if (exists) throw new AppError("CONFLICT", "An account with this email already exists. Try signing in.");
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      avatarColor: pickAvatarColor(input.email),
    });
    return user.toObject() as IUser;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new AppError("CONFLICT", "An account with this email already exists. Try signing in.");
    }
    throw err;
  }
}

/**
 * Always resolves successfully so the response doesn't reveal whether an
 * email is registered. The reset link is delivered through the EmailSender
 * (logged to the server console in development when no provider is set).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await connectDB();
  const user = await User.findOne({ email }).lean<IUser>();
  if (!user) return;
  await PasswordResetToken.updateMany({ userId: user._id, usedAt: null }, { $set: { usedAt: new Date() } });
  const { token, hash } = createToken();
  await PasswordResetToken.create({ userId: user._id, tokenHash: hash, expiresAt: addHours(new Date(), 1) });
  const link = `${serverEnv.appUrl()}/reset-password/${token}`;
  await getEmailSender().send({
    to: user.email,
    subject: "Reset your password",
    text: `Hi ${user.name},\n\nUse this link to set a new password (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await connectDB();
  const record = await PasswordResetToken.findOne({ tokenHash: sha256(token) });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("BAD_REQUEST", "This reset link is invalid or has expired. Request a new one.");
  }
  const passwordHash = await hashPassword(password);
  await User.updateOne({ _id: record.userId }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } });
  record.usedAt = new Date();
  await record.save();
}

export async function changePassword(userId: IUser["_id"], currentPassword: string, password: string): Promise<void> {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new AppError("UNAUTHORIZED", "Please sign in again.");
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new AppError("VALIDATION", "Your current password is incorrect.");
  user.passwordHash = await hashPassword(password);
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailSender().configured;
}
