import { Schema, model, models, type Model, type Types } from "mongoose";
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, ORDERING_MODES, type OrderingMode } from "@/types/domain";

export interface IAppSettings {
  _id: Types.ObjectId;
  coupleSpaceId: Types.ObjectId;
  timezone: string;
  /** Default monthly luxury budget in paise (0 = not set). */
  monthlyBudget: number;
  /** Monthly savings target in paise (0 = not set). */
  savingsTarget: number;
  /** Used by forecasting (0 = fall back to recent average). */
  expectedMonthlyContribution: number;
  strictBudget: boolean;
  orderingMode: OrderingMode;
  categories: string[];
  paymentMethods: string[];
  updatedAt: Date;
}

const appSettingsSchema = new Schema<IAppSettings>(
  {
    coupleSpaceId: { type: Schema.Types.ObjectId, ref: "CoupleSpace", required: true, unique: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    monthlyBudget: { type: Number, default: 0, min: 0 },
    savingsTarget: { type: Number, default: 0, min: 0 },
    expectedMonthlyContribution: { type: Number, default: 0, min: 0 },
    strictBudget: { type: Boolean, default: false },
    orderingMode: { type: String, enum: ORDERING_MODES, default: "SMART" },
    categories: { type: [String], default: () => [...DEFAULT_CATEGORIES] },
    paymentMethods: { type: [String], default: () => [...DEFAULT_PAYMENT_METHODS] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const AppSettings: Model<IAppSettings> =
  (models.AppSettings as Model<IAppSettings>) || model<IAppSettings>("AppSettings", appSettingsSchema);
