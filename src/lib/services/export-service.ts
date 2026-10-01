import "server-only";
import type { MemberContext } from "@/lib/auth/guard";
import { fromPaise } from "@/lib/money";
import { Activity, Allocation, AppSettings, MonthlyBudget, Transaction, WishlistItem, type ITransaction, type IWishlistItem } from "@/models";
import { getItemAllocations } from "./ledger";

/** Quotes a CSV cell and neutralises spreadsheet formula injection. */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : "");

export async function transactionsCsv(ctx: MemberContext): Promise<string> {
  const rows = await Transaction.find({ coupleSpaceId: ctx.spaceOid }).sort({ occurredAt: 1 }).lean<ITransaction[]>();
  const items = await WishlistItem.find({ coupleSpaceId: ctx.spaceOid }).select("name").lean();
  const itemNames = new Map(items.map((i) => [i._id.toString(), i.name]));
  const names = new Map(ctx.members.map((m) => [m.id, m.name]));
  return toCsv(
    ["Date", "Type", "Direction", `Amount (${ctx.space.currency})`, "Title", "Category", "Payment method", "Member", "Recorded by", "Wishlist item", "Notes", "Reversal of", "Source", "ID"],
    rows.map((t) => [
      iso(t.occurredAt),
      t.type,
      t.direction,
      fromPaise(t.amount).toFixed(2),
      t.title,
      t.category ?? "",
      t.paymentMethod ?? "",
      t.userId ? names.get(t.userId.toString()) ?? "" : "",
      names.get(t.performedBy.toString()) ?? "",
      t.wishlistItemId ? itemNames.get(t.wishlistItemId.toString()) ?? "" : "",
      t.notes,
      t.reversalOf?.toString() ?? "",
      t.source,
      t._id.toString(),
    ]),
  );
}

export async function wishlistCsv(ctx: MemberContext): Promise<string> {
  const items = await WishlistItem.find({ coupleSpaceId: ctx.spaceOid }).sort({ createdAt: 1 }).lean<IWishlistItem[]>();
  const allocations = await getItemAllocations(ctx.spaceOid);
  const names = new Map(ctx.members.map((m) => [m.id, m.name]));
  const owner = (i: IWishlistItem) =>
    i.ownerType === "SHARED" ? "Shared" : i.ownerUserId ? names.get(i.ownerUserId.toString()) ?? "Partner" : "Partner";
  return toCsv(
    ["Name", "Status", "Priority", "Owner", "Category", "Estimated price", "Allocated", "Actual price", "Target date", "Created", "Purchased", "Product URL", "Notes", "ID"],
    items.map((i) => [
      i.name,
      i.status,
      i.priority,
      owner(i),
      i.category,
      fromPaise(i.estimatedPrice).toFixed(2),
      fromPaise(allocations.get(i._id.toString()) ?? 0).toFixed(2),
      i.actualPurchasePrice ? fromPaise(i.actualPurchasePrice).toFixed(2) : "",
      iso(i.targetDate).slice(0, 10),
      iso(i.createdAt),
      iso(i.purchasedAt),
      i.productUrl ?? "",
      i.notes,
      i._id.toString(),
    ]),
  );
}

/** Full JSON backup of the couple space (no credentials or password hashes). */
export async function jsonBackup(ctx: MemberContext) {
  const filter = { coupleSpaceId: ctx.spaceOid };
  const [transactions, wishlist, allocations, settings, budgets, activity] = await Promise.all([
    Transaction.find(filter).lean(),
    WishlistItem.find(filter).lean(),
    Allocation.find(filter).lean(),
    AppSettings.findOne(filter).lean(),
    MonthlyBudget.find(filter).lean(),
    Activity.find(filter).lean(),
  ]);
  return {
    format: "luxe-fund-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "Amounts are integer minor units (paise for INR).",
    space: { id: ctx.spaceId, name: ctx.space.name, currency: ctx.space.currency },
    members: ctx.members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role })),
    settings,
    monthlyBudgets: budgets,
    wishlist,
    transactions,
    allocations,
    activity,
  };
}
