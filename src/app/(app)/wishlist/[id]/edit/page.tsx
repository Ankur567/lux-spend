import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { WishlistItemForm } from "@/components/wishlist/wishlist-item-form";
import { requireMemberPage } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { paiseToInput } from "@/lib/money";
import { getItemDetail, ownerChoiceFor } from "@/lib/services/wishlist-service";
import { ACTIVE_STATUSES } from "@/types/domain";

export const metadata = { title: "Edit wish" };

export default async function EditWishlistItemPage({ params }: PageProps<"/wishlist/[id]/edit">) {
  const { id } = await params;
  const ctx = await requireMemberPage();
  const detail = await getItemDetail(ctx, id).catch((err) => {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  });
  const { item } = detail;

  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Edit wish" backHref={`/wishlist/${item.id}`} />
      <WishlistItemForm
        itemId={item.id}
        priceLocked={!ACTIVE_STATUSES.includes(item.status)}
        defaults={{
          name: item.name,
          description: item.description,
          estimatedPrice: paiseToInput(item.estimatedPrice),
          priority: item.priority,
          owner: ownerChoiceFor(ctx, item),
          category: item.category,
          targetDate: item.targetDate ? item.targetDate.slice(0, 10) : "",
          imageUrl: item.imageUrl ?? "",
          productUrl: item.productUrl ?? "",
          notes: item.notes,
        }}
      />
    </div>
  );
}
