import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ICoupleSpace {
  _id: Types.ObjectId;
  name: string;
  currency: string;
  createdBy: Types.ObjectId;
  /**
   * Bumped inside every financial transaction. Concurrent financial writes on
   * the same space therefore conflict and are retried serially, which keeps
   * "allocated <= available" true under concurrency.
   */
  ledgerVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const coupleSpaceSchema = new Schema<ICoupleSpace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    currency: { type: String, default: "INR" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ledgerVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CoupleSpace: Model<ICoupleSpace> =
  (models.CoupleSpace as Model<ICoupleSpace>) || model<ICoupleSpace>("CoupleSpace", coupleSpaceSchema);
