/**
 * Development seed: two partners, ₹35,000 of contributions, five wishes,
 * then an auto-allocation run. Writes directly through the Mongoose models and
 * the same pure allocation engine the app uses.
 *
 *   npm run seed
 *
 * Refuses to run in production. Re-running replaces only the seed accounts'
 * own couple space.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";
import { addDays, addMonths, subDays, subMonths } from "date-fns";
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/lib/db/connect";
import { fundingStatus } from "../src/lib/finance/ledger-math";
import { planAutoAllocation, type EngineItem } from "../src/lib/finance/allocation-engine";
import {
  Activity,
  Allocation,
  AppSettings,
  CoupleSpace,
  Invitation,
  Membership,
  MonthlyBudget,
  Notification,
  Transaction,
  User,
  WishlistItem,
} from "../src/models";
import type { OwnerType, Priority } from "../src/types/domain";

const SEED_PASSWORD = process.env.SEED_PASSWORD || "luxefund123";
const ME = { name: "Joyee", email: "joyee@example.com", avatarColor: "#E58F9E" };
const PARTNER = { name: "Partner", email: "partner@example.com", avatarColor: "#9C8AD9" };
const rupees = (v: number) => Math.round(v * 100);

function assertNotProduction() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error("Refusing to seed: this script is for development only.");
    process.exit(1);
  }
}

async function wipeExisting() {
  const users = await User.find({ email: { $in: [ME.email, PARTNER.email] } }).lean();
  const spaceIds = (await Membership.find({ userId: { $in: users.map((u) => u._id) } }).lean()).map((m) => m.coupleSpaceId);
  if (spaceIds.length) {
    const filter = { coupleSpaceId: { $in: spaceIds } };
    // The ledger blocks deletes through Mongoose middleware; a dev reset goes to the raw collection.
    await Transaction.collection.deleteMany(filter);
    await Promise.all([
      Allocation.deleteMany(filter),
      WishlistItem.deleteMany(filter),
      AppSettings.deleteMany(filter),
      MonthlyBudget.deleteMany(filter),
      Activity.deleteMany(filter),
      Notification.deleteMany(filter),
      Invitation.deleteMany(filter),
      Membership.deleteMany(filter),
      CoupleSpace.deleteMany({ _id: { $in: spaceIds } }),
    ]);
  }
  await User.deleteMany({ _id: { $in: users.map((u) => u._id) } });
}

async function main() {
  assertNotProduction();
  await connectDB();
  await wipeExisting();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const [me, partner] = await User.create([
    { ...ME, passwordHash, onboardingCompleted: true },
    { ...PARTNER, passwordHash, onboardingCompleted: true },
  ]);
  const spaceCreatedAt = subMonths(new Date(), 3);
  const space = await CoupleSpace.create({ name: "Joyee & Partner's Luxury Fund", createdBy: me._id, currency: "INR", createdAt: spaceCreatedAt });
  await Membership.create([
    { coupleSpaceId: space._id, userId: me._id, role: "OWNER", joinedAt: spaceCreatedAt },
    { coupleSpaceId: space._id, userId: partner._id, role: "PARTNER", joinedAt: addDays(spaceCreatedAt, 1) },
  ]);
  await User.updateMany({ _id: { $in: [me._id, partner._id] } }, { $set: { coupleSpaceId: space._id } });
  await AppSettings.create({
    coupleSpaceId: space._id,
    monthlyBudget: rupees(8000),
    savingsTarget: rupees(15000),
    expectedMonthlyContribution: rupees(15000),
  });

  const now = new Date();
  const wishes: { name: string; price: number; priority: Priority; owner: "ME" | "PARTNER" | "US"; category: string; targetDate?: Date; description?: string; productUrl?: string }[] = [
    { name: "Sony WH-1000XM5", price: 29990, priority: "HIGH", owner: "ME", category: "Tech", description: "Noise-cancelling headphones, silver.", productUrl: "https://electronics.sony.com/" },
    { name: "Weekend in Goa", price: 25000, priority: "HIGH", owner: "US", category: "Travel", targetDate: addMonths(now, 3), description: "Beach villa, two nights." },
    { name: "Nike Dunk Low Panda", price: 8695, priority: "MEDIUM", owner: "PARTNER", category: "Fashion" },
    { name: "Omakase dinner", price: 6000, priority: "MEDIUM", owner: "US", category: "Dining", targetDate: addMonths(now, 1) },
    { name: "LEGO Botanical Orchid", price: 4499, priority: "LOW", owner: "PARTNER", category: "Collectibles" },
  ];
  const owner = (o: "ME" | "PARTNER" | "US"): { ownerType: OwnerType; ownerUserId: Types.ObjectId | null } =>
    o === "US" ? { ownerType: "SHARED", ownerUserId: null } : { ownerType: "INDIVIDUAL", ownerUserId: o === "ME" ? me._id : partner._id };

  const items = await WishlistItem.create(
    wishes.map((w, i) => ({
      coupleSpaceId: space._id,
      createdBy: i % 2 === 0 ? me._id : partner._id,
      ...owner(w.owner),
      name: w.name,
      description: w.description ?? "",
      productUrl: w.productUrl ?? null,
      category: w.category,
      estimatedPrice: rupees(w.price),
      priority: w.priority,
      rank: i + 1,
      targetDate: w.targetDate ? new Date(`${w.targetDate.toISOString().slice(0, 10)}T12:00:00.000Z`) : null,
      createdAt: subDays(now, 80 - i * 5),
    })),
  );

  const contributions = [
    { user: me, amount: 10000, daysAgo: 75, method: "UPI" },
    { user: partner, amount: 8000, daysAgo: 60, method: "Bank Transfer" },
    { user: me, amount: 5000, daysAgo: 35, method: "UPI" },
    { user: partner, amount: 7000, daysAgo: 20, method: "UPI" },
    { user: me, amount: 5000, daysAgo: 3, method: "Cash" },
  ];
  const total = contributions.reduce((a, c) => a + c.amount, 0);
  if (total !== 35000) throw new Error("Seed contributions must total ₹35,000");

  await Transaction.insertMany(
    contributions.map((c) => ({
      coupleSpaceId: space._id,
      userId: c.user._id,
      performedBy: c.user._id,
      type: "CONTRIBUTION",
      direction: "IN",
      amount: rupees(c.amount),
      paymentMethod: c.method,
      title: "Contribution",
      occurredAt: subDays(now, c.daysAgo),
    })),
  );
  await Activity.insertMany(
    contributions.map((c) => ({
      coupleSpaceId: space._id,
      actorId: c.user._id,
      type: "CONTRIBUTION_ADDED",
      data: { amount: rupees(c.amount), contributorId: c.user._id.toString() },
      createdAt: subDays(now, c.daysAgo),
    })),
  );

  const engineItems: EngineItem[] = items.map((i) => ({
    id: i._id.toString(),
    name: i.name,
    priority: i.priority,
    targetDate: i.targetDate ?? null,
    rank: i.rank,
    createdAt: i.createdAt,
    price: i.estimatedPrice,
    allocated: 0,
  }));
  const plan = planAutoAllocation(engineItems, rupees(total), "SMART");
  const moves = plan.lines.filter((l) => l.amount > 0);
  const batch = await Allocation.create({
    coupleSpaceId: space._id,
    performedBy: me._id,
    mode: "AUTO" as const,
    lines: moves.map((l) => ({ wishlistItemId: new Types.ObjectId(l.itemId), itemName: l.name, amount: l.amount, direction: "ALLOCATE" as const })),
    totalAllocated: plan.allocatedTotal,
    totalReleased: 0,
  });
  await Transaction.insertMany(
    moves.map((l) => ({
      coupleSpaceId: space._id,
      performedBy: me._id,
      type: "ALLOCATION",
      direction: "INTERNAL",
      amount: l.amount,
      wishlistItemId: new Types.ObjectId(l.itemId),
      allocationBatchId: batch._id,
      title: `Allocated to ${l.name}`,
      occurredAt: now,
      metadata: { mode: "AUTO" },
    })),
  );
  for (const item of items) {
    const allocated = moves.find((l) => l.itemId === item._id.toString())?.amount ?? 0;
    await WishlistItem.updateOne({ _id: item._id }, { $set: { status: fundingStatus(allocated, item.estimatedPrice) } });
  }
  await Activity.create({
    coupleSpaceId: space._id,
    actorId: me._id,
    type: "FUNDS_ALLOCATED",
    data: { amount: plan.allocatedTotal, count: moves.length, mode: "auto" },
  });

  console.log("\nSeeded development data:");
  console.log(`  ${ME.email} / ${SEED_PASSWORD}`);
  console.log(`  ${PARTNER.email} / ${SEED_PASSWORD}`);
  console.log(`  Contributions: ₹${total.toLocaleString("en-IN")}`);
  for (const l of plan.lines) {
    console.log(`  ${l.outcome.padEnd(8)} ${l.name}: ₹${(l.amount / 100).toLocaleString("en-IN")}`);
  }
  console.log(`  Unallocated: ₹${(plan.leftover / 100).toLocaleString("en-IN")}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
