import { Schema, model, models, type Model, type Types } from "mongoose";

export const MAX_MEMBERS = 2;

export interface IMembership {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "OWNER" | "PARTNER";
  joinedAt: Date;
}

const membershipSchema = new Schema<IMembership>({
  coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true, index: true },
  // A user belongs to exactly one couple space.
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  role: { type: String, enum: ["OWNER", "PARTNER"], required: true },
  joinedAt: { type: Date, default: () => new Date() },
});

export const Membership: Model<IMembership> =
  (models.Membership as Model<IMembership>) || model<IMembership>("Membership", membershipSchema);
