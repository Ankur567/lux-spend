export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const WISHLIST_STATUSES = [
  "WISHLIST",
  "PARTIALLY_FUNDED",
  "FUNDED",
  "PURCHASED",
  "ARCHIVED",
] as const;
export type WishlistStatus = (typeof WISHLIST_STATUSES)[number];
export const ACTIVE_STATUSES: WishlistStatus[] = ["WISHLIST", "PARTIALLY_FUNDED", "FUNDED"];

export const OWNER_TYPES = ["INDIVIDUAL", "SHARED"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

/** Owner as chosen in forms, relative to the current viewer. */
export const OWNER_CHOICES = ["ME", "PARTNER", "US"] as const;
export type OwnerChoice = (typeof OWNER_CHOICES)[number];

export const TRANSACTION_TYPES = [
  "CONTRIBUTION",
  "EXPENSE",
  "ALLOCATION",
  "DEALLOCATION",
  "REFUND",
  "ADJUSTMENT",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** IN/OUT change the fund total; INTERNAL moves money between unallocated and goals. */
export const DIRECTIONS = ["IN", "OUT", "INTERNAL"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const DEFAULT_PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Card", "Other"];

export const DEFAULT_CATEGORIES = [
  "Tech",
  "Fashion",
  "Collectibles",
  "Travel",
  "Dining",
  "Gifts",
  "Home",
  "Bike/Car",
  "Beauty",
  "Entertainment",
  "Other",
];

export const ORDERING_MODES = ["SMART", "MANUAL"] as const;
export type OrderingMode = (typeof ORDERING_MODES)[number];

export const ALLOCATION_MODES = [
  "AUTO",
  "MANUAL",
  "REBALANCE",
  "PURCHASE_RELEASE",
  "ARCHIVE_RELEASE",
  "PRICE_CHANGE_RELEASE",
  "EXPENSE_COVER",
  "UNDO",
] as const;
export type AllocationMode = (typeof ALLOCATION_MODES)[number];

export const ACTIVITY_TYPES = [
  "SPACE_CREATED",
  "PARTNER_JOINED",
  "CONTRIBUTION_ADDED",
  "EXPENSE_RECORDED",
  "ITEM_ADDED",
  "ITEM_UPDATED",
  "PRIORITY_CHANGED",
  "ITEM_FUNDED",
  "ITEM_PURCHASED",
  "ITEM_ARCHIVED",
  "ITEM_RESTORED",
  "FUNDS_ALLOCATED",
  "FUNDS_RELEASED",
  "ALLOCATION_UNDONE",
  "TRANSACTION_REVERSED",
  "SETTINGS_UPDATED",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "DEPOSIT",
  "ITEM_FUNDED",
  "NEAR_GOAL",
  "TARGET_PROGRESS",
  "BUDGET_WARNING",
  "PARTNER_JOINED",
  "PURCHASE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------------------
// DTOs: plain serializable shapes passed from server to client components.
// ---------------------------------------------------------------------------

export interface MemberDTO {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl: string | null;
  role: "OWNER" | "PARTNER";
  isMe: boolean;
}

export interface WishlistItemDTO {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  productUrl: string | null;
  category: string;
  estimatedPrice: number;
  actualPurchasePrice: number | null;
  priority: Priority;
  rank: number;
  targetDate: string | null;
  status: WishlistStatus;
  notes: string;
  ownerType: OwnerType;
  ownerUserId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  purchasedAt: string | null;
  archivedAt: string | null;
  /** Derived from the ledger. */
  allocated: number;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  direction: Direction;
  amount: number;
  userId: string | null;
  performedBy: string;
  wishlistItemId: string | null;
  wishlistItemName: string | null;
  allocationBatchId: string | null;
  paymentMethod: string | null;
  category: string | null;
  title: string;
  notes: string;
  occurredAt: string;
  createdAt: string;
  reversalOf: string | null;
  reversed: boolean;
  source: "MANUAL" | "PROVIDER" | "SYSTEM";
}

export interface WalletSummary {
  contributed: number;
  spent: number;
  refunded: number;
  adjustments: number;
  /** Money currently in the fund (contributions - expenses + refunds +/- adjustments). */
  available: number;
  allocated: number;
  unallocated: number;
}

export interface MonthStats {
  month: string; // yyyy-MM
  saved: number;
  spent: number;
  net: number;
  byUser: { userId: string; contributed: number; spent: number }[];
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  actorId: string | null;
  data: Record<string, string | number | null>;
  wishlistItemId: string | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SettingsDTO {
  currency: string;
  timezone: string;
  monthlyBudget: number;
  savingsTarget: number;
  expectedMonthlyContribution: number;
  strictBudget: boolean;
  orderingMode: OrderingMode;
  categories: string[];
  paymentMethods: string[];
}

export interface SpaceDTO {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
}

export interface AllocationLineResult {
  itemId: string;
  name: string;
  amount: number;
  outcome: "FUNDED" | "PARTIAL" | "WAITING";
  remainingAfter: number;
}

export interface AllocationRunResult {
  batchId: string | null;
  allocatedTotal: number;
  leftover: number;
  lines: AllocationLineResult[];
}
