import "server-only";

// Usage-limits + plan module. Pure, env-driven domain logic (no DB, no Stripe
// client) so it stays fully unit-testable and satisfies the "domain logic lives
// in src/lib, not components" rule.

/** Free-tier caps from the project spec. Pro is unlimited. */
export const FREE_LIMITS = { items: 50, collections: 3 } as const;

/**
 * System item types whose listing pages and uploads are Pro-only. Free users
 * get an upgrade page instead of the `/items/files` and `/items/images` lists.
 */
export const PRO_ITEM_TYPES = ["file", "image"] as const;

/** True when a system item type (by name) is gated behind Pro. */
export function isProItemType(typeName: string): boolean {
  return (PRO_ITEM_TYPES as readonly string[]).includes(typeName.toLowerCase());
}

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

/** What a PlanLimitError was raised for — drives the upgrade CTA message. */
export type PlanLimitResource = "item" | "collection" | "file" | "image" | "ai";

/**
 * Thrown by plan gating (createItem / createCollection / the Pro-only FILE &
 * IMAGE branch) when a Free user hits a cap or a Pro-only surface, so the calling
 * action can map it to an "Upgrade to Pro" message distinct from other failures.
 * Defined here so both phases share one type.
 */
export class PlanLimitError extends Error {
  constructor(public readonly resource: PlanLimitResource) {
    super(`Free plan limit reached for ${resource}.`);
    this.name = "PlanLimitError";
  }
}

/** User-facing upgrade CTA copy for each gated resource. */
export const PLAN_LIMIT_MESSAGES: Record<PlanLimitResource, string> = {
  item:
    "You've reached the Free plan's 50-item limit. Upgrade to Pro for unlimited items.",
  collection:
    "You've reached the Free plan's 3-collection limit. Upgrade to Pro for unlimited collections.",
  file: "File uploads are a Pro feature. Upgrade to Pro to attach files.",
  image: "Image uploads are a Pro feature. Upgrade to Pro to upload images.",
  ai: "AI features are a Pro feature. Upgrade to Pro to use AI auto-tagging.",
};
