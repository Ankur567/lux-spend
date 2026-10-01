export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Luxe Fund";

export const fundUpi = {
  id: process.env.NEXT_PUBLIC_FUND_UPI_ID || "",
  name: process.env.NEXT_PUBLIC_FUND_UPI_NAME || APP_NAME,
};

export const isUpiConfigured = fundUpi.id.length > 0;
