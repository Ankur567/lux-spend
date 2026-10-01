import { PageHeader } from "@/components/page-header";
import { WishlistItemForm } from "@/components/wishlist/wishlist-item-form";
import { requireMemberPage } from "@/lib/auth/guard";

export const metadata = { title: "New wish" };

export default async function NewWishlistItemPage() {
  await requireMemberPage();
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="New wish" backHref="/wishlist" />
      <WishlistItemForm />
    </div>
  );
}
