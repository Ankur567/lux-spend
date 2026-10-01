import "server-only";
import { Notification } from "@/models";
import type { NotificationChannel, NotificationMessage } from "./types";

export class InAppChannel implements NotificationChannel {
  readonly name = "in-app";

  isEnabled() {
    return true;
  }

  async deliver(message: NotificationMessage): Promise<void> {
    try {
      await Notification.create({
        coupleSpaceId: message.coupleSpaceId,
        userId: message.recipientId,
        type: message.type,
        title: message.title,
        body: message.body,
        link: message.link ?? null,
        dedupeKey: message.dedupeKey ?? undefined,
      });
    } catch (err) {
      // Duplicate dedupeKey means this event was already announced.
      if ((err as { code?: number }).code === 11000) return;
      throw err;
    }
  }
}
