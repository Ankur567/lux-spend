import { Schema, model, models, type Model, type Types } from "mongoose";
import { DIRECTIONS, TRANSACTION_TYPES, type Direction, type TransactionType } from "@/types/domain";

/**
 * Immutable ledger entry. The ledger is the single source of truth for every
 * balance in the app. Entries are never updated or deleted; mistakes are
 * corrected with reversal entries (`reversalOf`).
 */
export interface ITransaction {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  /** The member the money belongs to (contributor / payer). */
  userId?: Types.ObjectId | null;
  /** The member who recorded the entry. */
  performedBy: Types.ObjectId;
  type: TransactionType;
  direction: Direction;
  /** Positive integer paise. Direction carries the sign. */
  amount: number;
  wishlistItemId?: Types.ObjectId | null;
  allocationBatchId?: Types.ObjectId | null;
  paymentMethod?: string | null;
  category?: string | null;
  title: string;
  notes: string;
  occurredAt: Date;
  reversalOf?: Types.ObjectId | null;
  idempotencyKey?: string | null;
  source: "MANUAL" | "PROVIDER" | "SYSTEM";
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true, immutable: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, immutable: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true, immutable: true },
    direction: { type: String, enum: DIRECTIONS, required: true, immutable: true },
    amount: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
      validate: { validator: Number.isInteger, message: "Amount must be integer paise" },
    },
    wishlistItemId: { type: Schema.Types.ObjectId, ref: "WishlistItem", default: null, immutable: true },
    allocationBatchId: { type: Schema.Types.ObjectId, ref: "Allocation", default: null, immutable: true },
    paymentMethod: { type: String, default: null, immutable: true },
    category: { type: String, default: null, immutable: true },
    title: { type: String, default: "", maxlength: 140, immutable: true },
    notes: { type: String, default: "", maxlength: 1000, immutable: true },
    occurredAt: { type: Date, required: true, immutable: true },
    reversalOf: { type: Schema.Types.ObjectId, ref: "Transaction", default: null, immutable: true },
    idempotencyKey: { type: String, default: undefined, immutable: true },
    source: { type: String, enum: ["MANUAL", "PROVIDER", "SYSTEM"], default: "MANUAL", immutable: true },
    metadata: { type: Schema.Types.Mixed, default: {}, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionSchema.index({ coupleSpaceId: 1, occurredAt: -1 });
transactionSchema.index({ coupleSpaceId: 1, type: 1, direction: 1 });
transactionSchema.index({ coupleSpaceId: 1, wishlistItemId: 1 });
transactionSchema.index({ reversalOf: 1 }, { unique: true, partialFilterExpression: { reversalOf: { $type: "objectId" } } });
transactionSchema.index(
  { coupleSpaceId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

function blockMutation(): never {
  throw new Error("Ledger transactions are immutable. Create a reversal entry instead.");
}

transactionSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "findOneAndReplace", "deleteOne", "deleteMany", "findOneAndDelete"],
  function () {
    blockMutation();
  },
);

export const Transaction: Model<ITransaction> =
  (models.Transaction as Model<ITransaction>) || model<ITransaction>("Transaction", transactionSchema);
