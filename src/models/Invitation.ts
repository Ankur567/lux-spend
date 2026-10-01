import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IInvitation {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  code: string;
  invitedBy: Types.ObjectId;
  email?: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: Date;
  acceptedBy?: Types.ObjectId | null;
  acceptedAt?: Date | null;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REVOKED"], default: "PENDING" },
    expiresAt: { type: Date, required: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Invitation: Model<IInvitation> =
  (models.Invitation as Model<IInvitation>) || model<IInvitation>("Invitation", invitationSchema);
