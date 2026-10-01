import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IPasswordResetToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the token; the raw token is only ever sent to the user. */
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

// Let MongoDB clean up expired tokens automatically.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken: Model<IPasswordResetToken> =
  (models.PasswordResetToken as Model<IPasswordResetToken>) ||
  model<IPasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
