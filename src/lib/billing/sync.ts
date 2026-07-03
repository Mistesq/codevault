import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Active-ish statuses grant Pro; everything else (canceled, unpaid, incomplete,
// past_due, paused, …) revokes it.
const PRO_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  "active",
  "trialing",
]);

/**
 * Reconcile a user's Pro state from a Stripe Subscription object. Called from the
 * webhook for every subscription lifecycle event. Resolves the user by
 * `stripeCustomerId`, falling back to the `subscription.metadata.userId` stamped
 * at checkout (so it works even before a `stripeCustomerId` is stored).
 *
 * Idempotent: re-running on a duplicate / re-delivered event writes the same
 * derived state, so double delivery has no extra effect. When the subscription
 * maps to no known user (e.g. an event for a different environment) it's a no-op.
 */
export async function syncSubscriptionToUser(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const active = PRO_STATUSES.has(sub.status);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { stripeCustomerId: customerId },
        // Fall back to the id stamped on the subscription at checkout. The
        // "__none__" placeholder keeps the clause valid when metadata is absent.
        { id: sub.metadata?.userId ?? "__none__" },
      ],
    },
    select: { id: true },
  });
  if (!user) {
    console.warn("Stripe subscription for unknown user:", customerId);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPro: active,
      stripeCustomerId: customerId,
      // Keep the subscription id only while the plan is active so a later
      // checkout can start clean once it's been canceled.
      stripeSubscriptionId: active ? sub.id : null,
    },
  });
}
