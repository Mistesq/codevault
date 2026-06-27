import { z } from "zod";

// Shared auth input schemas. Used by the Credentials `authorize` callback and
// the registration API route so validation rules live in one place.

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(100),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
