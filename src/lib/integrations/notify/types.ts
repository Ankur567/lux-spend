import type { Types } from "mongoose";
import type { NotificationType } from "@/types/domain";

export interface NotificationMessage {
  coupleSpaceId: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  dedupeKey?: string | null;
}

/**
 * A delivery channel. In-app is always on; push (Web Push / FCM) or email
 * channels can be added by implementing this interface and registering them
 * in notification-service.ts. Channels must never throw for delivery issues
 * that should not break the user's action.
 */
export interface NotificationChannel {
  readonly name: string;
  isEnabled(): boolean;
  deliver(message: NotificationMessage): Promise<void>;
}
