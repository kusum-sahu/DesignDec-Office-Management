import { z } from "zod";

export const loginSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(1, "Employee ID is required")
    .max(50, "Employee ID is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password cannot be the same as current password",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  email: z.string().trim().email("Please enter a valid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address"),
    otp: z
      .string()
      .trim()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d+$/, "OTP must contain only numbers"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
