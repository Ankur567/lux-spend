import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Per-month budget snapshot. When the default budget changes, the current
 * month is upserted so past months keep the budget that applied at the time.
 */
export interface IMonthlyBudget {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  month: string; // yyyy-MM
  amount: number;
  savingsTarget: number;
}

const monthlyBudgetSchema = new Schema<IMonthlyBudget>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    amount: { type: Number, default: 0, min: 0 },
    savingsTarget: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

monthlyBudgetSchema.index({ coupleSpaceId: 1, month: 1 }, { unique: true });

export const MonthlyBudget: Model<IMonthlyBudget> =
  (models.MonthlyBudget as Model<IMonthlyBudget>) || model<IMonthlyBudget>("MonthlyBudget", monthlyBudgetSchema);
