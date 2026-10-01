import { Schema, model, models, type Model, type Types } from "mongoose";
import { ALLOCATION_MODES, type AllocationMode } from "@/types/domain";

export interface IAllocationLine {
  wishlistItemId: Types.ObjectId;
  itemName: string;
  amount: number;
  direction: "ALLOCATE" | "DEALLOCATE";
}

/**
 * A batch of allocation moves performed together (one auto-allocation run, one
 * manual allocation, a purchase release...). The individual moves live in the
 * ledger as ALLOCATION / DEALLOCATION transactions referencing this batch.
 */
export interface IAllocation {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  performedBy: Types.ObjectId;
  mode: AllocationMode;
  lines: IAllocationLine[];
  totalAllocated: number;
  totalReleased: number;
  undoneAt?: Date | null;
  undoneBy?: Types.ObjectId | null;
  undoBatchId?: Types.ObjectId | null;
  createdAt: Date;
}

const lineSchema = new Schema<IAllocationLine>(
  {
    wishlistItemId: { type: Schema.Types.ObjectId, ref: "WishlistItem", required: true },
    itemName: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    direction: { type: String, enum: ["ALLOCATE", "DEALLOCATE"], required: true },
  },
  { _id: false },
);

const allocationSchema = new Schema<IAllocation>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mode: { type: String, enum: ALLOCATION_MODES, required: true },
    lines: { type: [lineSchema], default: [] },
    totalAllocated: { type: Number, default: 0 },
    totalReleased: { type: Number, default: 0 },
    undoneAt: { type: Date, default: null },
    undoneBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    undoBatchId: { type: Schema.Types.ObjectId, ref: "Allocation", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

allocationSchema.index({ coupleSpaceId: 1, createdAt: -1 });

export const Allocation: Model<IAllocation> =
  (models.Allocation as Model<IAllocation>) || model<IAllocation>("Allocation", allocationSchema);
