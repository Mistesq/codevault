import "server-only";

// Usage-limits + plan module. Pure, env-driven domain logic (no DB, no Stripe
// client) so it stays fully unit-testable and satisfies the "domain logic lives
// in src/lib, not components" rule.

/** Free-tier caps from the project spec. Pro is unlimited. */
export const FREE_LIMITS = { items: 50, collections: 3 } as const;

export type BillingInterval = "monthly" | "yearly";

/** Resolve the configured Stripe price id for a checkout interval, or null. */
export function priceIdForInterval(interval: BillingInterval): string | null {
  return interval === "yearly"
    ? (process.env.STRIPE_PRICE_YEARLY ?? null)
    : (process.env.STRIPE_PRICE_MONTHLY ?? null);
}

/**
 * Reverse lookup used later by the webhook to know which interval a purchased
 * price id corresponds to. Returns null for an unknown/unconfigured id.
 */
export function intervalForPriceId(priceId: string): BillingInterval | null {
  if (process.env.STRIPE_PRICE_YEARLY && priceId === process.env.STRIPE_PRICE_YEARLY) {
    return "yearly";
  }
  if (process.env.STRIPE_PRICE_MONTHLY && priceId === process.env.STRIPE_PRICE_MONTHLY) {
    return "monthly";
  }
  return null;
}

/** True when a Free user is already at (or over) the item cap. */
export function isAtItemLimit(isPro: boolean, count: number): boolean {
  return !isPro && count >= FREE_LIMITS.items;
}

/** True when a Free user is already at (or over) the collection cap. */
export function isAtCollectionLimit(isPro: boolean, count: number): boolean {
  return !isPro && count >= FREE_LIMITS.collections;
}

/**
 * Thrown by Phase 2 plan gating (createItem / createCollection) when a Free user
 * hits a cap, so the calling action can map it to an "Upgrade to Pro" message
 * distinct from other failures. Defined here so both phases share one type.
 */
export class PlanLimitError extends Error {
  constructor(public readonly resource: "item" | "collection") {
    super(`Free plan limit reached for ${resource}.`);
    this.name = "PlanLimitError";
  }
}
