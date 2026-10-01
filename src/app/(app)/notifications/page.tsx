import { Bell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/page-header";
import { requireMemberPage } from "@/lib/auth/guard";
import { listNotifications } from "@/lib/services/notification-service";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireMemberPage();
  const notifications = await listNotifications(ctx, 100);
  return (
    <div className="pt-6 md:pt-8">
      <PageHeader title="Notifications" />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title="All caught up" description="You'll hear about deposits, funded wishes and budget alerts here." />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
