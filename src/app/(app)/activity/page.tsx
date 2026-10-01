import { History } from "lucide-react";
import { ActivityList } from "@/components/activity/activity-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireMemberPage } from "@/lib/auth/guard";
import { listActivity } from "@/lib/services/activity-service";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const ctx = await requireMemberPage();
  const activity = await listActivity(ctx, 100);
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Activity" subtitle="Everything that's happened in your space." backHref="/" />
      {activity.length === 0 ? (
        <EmptyState icon={<History className="size-6" />} title="Quiet so far" description="Contributions, new wishes and purchases will show up here." />
      ) : (
        <ActivityList items={activity} members={ctx.members} currency={ctx.space.currency} />
      )}
    </div>
  );
}
