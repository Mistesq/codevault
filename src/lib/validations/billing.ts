import { z } from "zod";

// Input schema for the checkout server action. Kept alongside the other
// validation schemas so all validation rules live in one place.

export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
