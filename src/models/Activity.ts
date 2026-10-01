import { Schema, model, models, type Model, type Types } from "mongoose";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";

export interface IActivity {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  type: ActivityType;
  data: Record<string, string | number | null>;
  wishlistItemId?: Types.ObjectId | null;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    wishlistItemId: { type: Schema.Types.ObjectId, ref: "WishlistItem", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ coupleSpaceId: 1, createdAt: -1 });

export const Activity: Model<IActivity> =
  (models.Activity as Model<IActivity>) || model<IActivity>("Activity", activitySchema);
