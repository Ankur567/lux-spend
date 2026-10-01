import { connection } from "next/server";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { isEmailDeliveryConfigured } from "@/lib/services/auth-service";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  // Email configuration is read at request time, not baked in at build time.
  await connection();
  return <ForgotPasswordForm emailConfigured={isEmailDeliveryConfigured()} />;
}
