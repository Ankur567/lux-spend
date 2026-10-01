import { Schema, model, models, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/types/domain";

export interface INotification {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  readAt?: Date | null;
  /** Prevents duplicate notifications for the same event per recipient. */
  dedupeKey?: string | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: "", maxlength: 500 },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) || model<INotification>("Notification", notificationSchema);
