import { Schema, model, models, type Model, type Types } from "mongoose";
import { OWNER_TYPES, PRIORITIES, WISHLIST_STATUSES, type OwnerType, type Priority, type WishlistStatus } from "@/types/domain";

export interface IWishlistItem {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  createdBy: Types.ObjectId;
  ownerType: OwnerType;
  /** null with ownerType INDIVIDUAL means "the partner who has not joined yet". */
  ownerUserId?: Types.ObjectId | null;
  name: string;
  description: string;
  imageUrl?: string | null;
  productUrl?: string | null;
  category: string;
  /** Integer paise. */
  estimatedPrice: number;
  actualPurchasePrice?: number | null;
  priority: Priority;
  rank: number;
  targetDate?: Date | null;
  /** Cached from the ledger inside the same DB transaction as every allocation change. */
  status: WishlistStatus;
  notes: string;
  purchasedAt?: Date | null;
  purchasedBy?: Types.ObjectId | null;
  archivedAt?: Date | null;
  fundedNotifiedAt?: Date | null;
  progressNotifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const wishlistItemSchema = new Schema<IWishlistItem>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerType: { type: String, enum: OWNER_TYPES, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    imageUrl: { type: String, default: null },
    productUrl: { type: String, default: null },
    category: { type: String, default: "Other", maxlength: 40 },
    estimatedPrice: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Price must be integer paise" },
    },
    actualPurchasePrice: { type: Number, default: null },
    priority: { type: String, enum: PRIORITIES, required: true },
    rank: { type: Number, default: 0 },
    targetDate: { type: Date, default: null },
    status: { type: String, enum: WISHLIST_STATUSES, default: "WISHLIST" },
    notes: { type: String, default: "", maxlength: 2000 },
    purchasedAt: { type: Date, default: null },
    purchasedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    archivedAt: { type: Date, default: null },
    fundedNotifiedAt: { type: Date, default: null },
    progressNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

wishlistItemSchema.index({ coupleSpaceId: 1, status: 1, priority: 1 });
wishlistItemSchema.index({ coupleSpaceId: 1, createdAt: -1 });

export const WishlistItem: Model<IWishlistItem> =
  (models.WishlistItem as Model<IWishlistItem>) || model<IWishlistItem>("WishlistItem", wishlistItemSchema);
