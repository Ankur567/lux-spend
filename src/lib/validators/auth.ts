import { z } from "zod";
import { requiredText } from "./common";

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(254);
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "That password is too long");

export const registerSchema = z.object({
  name: requiredText(60, "Name"),
  email,
  password,
  inviteCode: z.string().trim().max(20).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
  callbackUrl: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(200),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
