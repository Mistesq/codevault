"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { priceIdForInterval } from "@/lib/billing/plan";
import { checkoutSchema } from "@/lib/validations/billing";
import { getAppUrl } from "@/lib/email/resend";

// Coding standards' action pattern: { success, data, error }.
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a Stripe Checkout Session for CodeVault Pro and return its hosted URL.
 * The calling client component redirects via `window.location.href` on success
 * (Server Actions can't `redirect()` to an external origin — that wiring is
 * Phase 2). Guards: signed-in, Stripe configured, valid interval, not already
 * Pro. Links the session back to our user via `client_reference_id` and
 * `subscription_data.metadata.userId` so the Phase 2 webhook can resolve the
 * user even before a `stripeCustomerId` is stored.
 */
export async function createCheckoutSession(
  input: unknown,
): Promise<ActionResult<{ url: string }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be signed in." };

  if (!isStripeConfigured()) {
    return { success: false, error: "Billing is not configured." };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid plan." };

  const priceId = priceIdForInterval(parsed.data.interval);
  if (!priceId) return { success: false, error: "Plan is unavailable." };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isPro: true, stripeCustomerId: true },
    });
    if (!user) return { success: false, error: "Account not found." };
    if (user.isPro) return { success: false, error: "You're already Pro." };

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the saved customer, else let Stripe create one keyed to the email.
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      client_reference_id: userId,
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${getAppUrl()}/settings?checkout=success`,
      cancel_url: `${getAppUrl()}/settings?checkout=cancelled`,
    });

    if (!checkout.url) {
      return { success: false, error: "Could not start checkout." };
    }
    return { success: true, data: { url: checkout.url } };
  } catch (error) {
    console.error("Create checkout session failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Create a Stripe Billing Customer Portal session for managing / cancelling the
 * subscription, returning its hosted URL. Requires a signed-in user with a saved
 * `stripeCustomerId` (i.e. an existing subscriber). The client redirects to the
 * URL on success.
 */
export async function createPortalSession(): Promise<
  ActionResult<{ url: string }>
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be signed in." };

  if (!isStripeConfigured()) {
    return { success: false, error: "Billing is not configured." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return { success: false, error: "No active subscription found." };
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/settings`,
    });
    return { success: true, data: { url: portal.url } };
  } catch (error) {
    console.error("Create portal session failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
