import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FREE_LIMITS,
  intervalForPriceId,
  isAtCollectionLimit,
  isAtItemLimit,
  isProItemType,
  PLAN_LIMIT_MESSAGES,
  PlanLimitError,
  priceIdForInterval,
} from "@/lib/billing/plan";

// priceIdForInterval / intervalForPriceId read process.env directly, so we
// snapshot and restore the two price-id keys around each test.
const MONTHLY = "price_monthly_123";
const YEARLY = "price_yearly_456";

let savedMonthly: string | undefined;
let savedYearly: string | undefined;

beforeEach(() => {
  savedMonthly = process.env.STRIPE_PRICE_MONTHLY;
  savedYearly = process.env.STRIPE_PRICE_YEARLY;
  process.env.STRIPE_PRICE_MONTHLY = MONTHLY;
  process.env.STRIPE_PRICE_YEARLY = YEARLY;
});

afterEach(() => {
  if (savedMonthly === undefined) delete process.env.STRIPE_PRICE_MONTHLY;
  else process.env.STRIPE_PRICE_MONTHLY = savedMonthly;
  if (savedYearly === undefined) delete process.env.STRIPE_PRICE_YEARLY;
  else process.env.STRIPE_PRICE_YEARLY = savedYearly;
});

describe("isAtItemLimit", () => {
  it("is true for a Free user at exactly the cap", () => {
    expect(isAtItemLimit(false, FREE_LIMITS.items)).toBe(true);
  });

  it("is true for a Free user over the cap", () => {
    expect(isAtItemLimit(false, FREE_LIMITS.items + 5)).toBe(true);
  });

  it("is false for a Free user one under the cap", () => {
    expect(isAtItemLimit(false, FREE_LIMITS.items - 1)).toBe(false);
  });

  it("is false for a Pro user at any count", () => {
    expect(isAtItemLimit(true, FREE_LIMITS.items)).toBe(false);
    expect(isAtItemLimit(true, FREE_LIMITS.items * 100)).toBe(false);
  });
});

describe("isAtCollectionLimit", () => {
  it("is true for a Free user at exactly the cap", () => {
    expect(isAtCollectionLimit(false, FREE_LIMITS.collections)).toBe(true);
  });

  it("is false for a Free user one under the cap", () => {
    expect(isAtCollectionLimit(false, FREE_LIMITS.collections - 1)).toBe(false);
  });

  it("is false for a Pro user at any count", () => {
    expect(isAtCollectionLimit(true, FREE_LIMITS.collections + 10)).toBe(false);
  });
});

describe("priceIdForInterval", () => {
  it("resolves the monthly price id", () => {
    expect(priceIdForInterval("monthly")).toBe(MONTHLY);
  });

  it("resolves the yearly price id", () => {
    expect(priceIdForInterval("yearly")).toBe(YEARLY);
  });

  it("returns null when the interval's env var is missing", () => {
    delete process.env.STRIPE_PRICE_MONTHLY;
    expect(priceIdForInterval("monthly")).toBeNull();
  });
});

describe("PlanLimitError", () => {
  it("carries the resource it was raised for", () => {
    expect(new PlanLimitError("item").resource).toBe("item");
    expect(new PlanLimitError("collection").resource).toBe("collection");
    expect(new PlanLimitError("file").resource).toBe("file");
  });

  it("has an upgrade CTA message for every gated resource", () => {
    for (const resource of ["item", "collection", "file", "image"] as const) {
      expect(PLAN_LIMIT_MESSAGES[resource]).toMatch(/pro/i);
    }
  });
});

describe("isProItemType", () => {
  it("gates file and image types (case-insensitive)", () => {
    expect(isProItemType("file")).toBe(true);
    expect(isProItemType("image")).toBe(true);
    expect(isProItemType("File")).toBe(true);
    expect(isProItemType("IMAGE")).toBe(true);
  });

  it("does not gate the free text-based types", () => {
    for (const name of ["snippet", "prompt", "note", "command", "URL"]) {
      expect(isProItemType(name)).toBe(false);
    }
  });
});

describe("intervalForPriceId", () => {
  it("round-trips the monthly id", () => {
    expect(intervalForPriceId(MONTHLY)).toBe("monthly");
  });

  it("round-trips the yearly id", () => {
    expect(intervalForPriceId(YEARLY)).toBe("yearly");
  });

  it("returns null for an unknown price id", () => {
    expect(intervalForPriceId("price_unknown")).toBeNull();
  });

  it("returns null (not a false match) when a price env var is unset", () => {
    delete process.env.STRIPE_PRICE_MONTHLY;
    delete process.env.STRIPE_PRICE_YEARLY;
    expect(intervalForPriceId(MONTHLY)).toBeNull();
  });
});
