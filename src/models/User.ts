import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  avatarUrl?: string | null;
  coupleSpaceId?: Types.ObjectId | null;
  onboardingCompleted: boolean;
  /** Incremented on password change to invalidate existing sessions. */
  sessionVersion: number;
  preferences: {
    theme: "system" | "light" | "dark";
  };
  createdAt: Date;
  updatedAt: Date;
}

const AVATAR_COLORS = ["#E58F9E", "#9C8AD9", "#D9A55B", "#6FB3A8", "#7B9FD9", "#D98A6F"];

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    avatarColor: { type: String, default: AVATAR_COLORS[0] },
    avatarUrl: { type: String, default: null },
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", default: null, index: true },
    onboardingCompleted: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    preferences: {
      theme: { type: String, enum: ["system", "light", "dark"], default: "system" },
    },
  },
  { timestamps: true },
);

export const User: Model<IUser> = (models.User as Model<IUser>) || model<IUser>("User", userSchema);
