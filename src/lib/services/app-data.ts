import "server-only";
import type { AppData } from "@/components/app/app-context";
import type { MemberContext } from "@/lib/auth/guard";
import { getPaymentProviderStatus } from "@/lib/integrations/payment";
import { fundUpi, isUpiConfigured } from "@/lib/public-config";
import { unreadCount } from "./notification-service";
import { getSettingsDTO } from "./settings-service";

/** Everything client components need about the current member and space. */
export async function buildAppData(ctx: MemberContext): Promise<AppData> {
  const [settings, unread] = await Promise.all([getSettingsDTO(ctx), unreadCount(ctx)]);
  const payments = getPaymentProviderStatus();
  return {
    me: ctx.me,
    partner: ctx.partner,
    members: ctx.members,
    space: {
      id: ctx.spaceId,
      name: ctx.space.name,
      currency: ctx.space.currency,
      createdAt: new Date(ctx.space.createdAt).toISOString(),
    },
    settings,
    currency: ctx.space.currency,
    upi: isUpiConfigured && ctx.space.currency === "INR" ? { id: fundUpi.id, name: fundUpi.name } : null,
    onlinePayments: { enabled: payments.configured && payments.id !== "manual", provider: payments.displayName },
    unreadNotifications: unread,
  };
}
