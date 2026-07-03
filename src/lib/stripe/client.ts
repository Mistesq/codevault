import "server-only";
import Stripe from "stripe";

// Stripe SDK client + config guard. Kept server-only so the secret key never
// reaches a client bundle. Mirrors the lazy-singleton pattern in
// src/lib/r2.ts and src/lib/email/resend.ts.

let cached: Stripe | null = null;

/** Lazily instantiate the Stripe client; throws if the secret key is missing. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  // Omit apiVersion to pin the SDK's default; set it explicitly to the version
  // shown in the Stripe Dashboard once the integration goes live.
  cached = new Stripe(key);
  return cached;
}

/**
 * The soft guard the billing actions branch on: true only when the secret key
 * AND both recurring price ids are configured, so we never start a checkout we
 * can't complete.
 */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_MONTHLY &&
      process.env.STRIPE_PRICE_YEARLY,
  );
}
