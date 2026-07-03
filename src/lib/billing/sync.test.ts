import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Unit test for the webhook's DB reconciliation. Prisma is mocked — no database.
// We assert user resolution (by customer id, falling back to metadata.userId),
// the isPro/subscription-id derivation from status, unknown-customer no-op, and
// idempotency (same event twice writes the same state).
const { user } = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user } }));

import { syncSubscriptionToUser } from "@/lib/billing/sync";

// Minimal Subscription shape — only the fields sync.ts reads.
function subscription(
  overrides: Partial<Stripe.Subscription> = {},
): Stripe.Subscription {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    metadata: {},
    ...overrides,
  } as Stripe.Subscription;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncSubscriptionToUser", () => {
  it("sets isPro true and stores the subscription id for an active subscription", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(subscription({ status: "active" }));

    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        isPro: true,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
      },
    });
  });

  it("treats a trialing subscription as Pro", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(subscription({ status: "trialing" }));

    expect(user.update.mock.calls[0][0].data.isPro).toBe(true);
  });

  it("revokes Pro and nulls the subscription id when deleted/canceled", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(subscription({ status: "canceled" }));

    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        isPro: false,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: null,
      },
    });
  });

  it("revokes Pro for an unpaid subscription", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(subscription({ status: "unpaid" }));

    expect(user.update.mock.calls[0][0].data).toMatchObject({
      isPro: false,
      stripeSubscriptionId: null,
    });
  });

  it("resolves the user by customer id, falling back to metadata.userId", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(
      subscription({ customer: "cus_abc", metadata: { userId: "user_1" } }),
    );

    expect(user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ stripeCustomerId: "cus_abc" }, { id: "user_1" }],
      },
      select: { id: true },
    });
  });

  it("uses the placeholder id when no metadata.userId is present", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(subscription({ metadata: {} }));

    expect(user.findFirst.mock.calls[0][0].where.OR[1]).toEqual({
      id: "__none__",
    });
  });

  it("handles a customer passed as an object (not just an id string)", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });

    await syncSubscriptionToUser(
      subscription({ customer: { id: "cus_obj" } as Stripe.Customer }),
    );

    expect(user.update.mock.calls[0][0].data.stripeCustomerId).toBe("cus_obj");
  });

  it("is a no-op when the subscription maps to no known user", async () => {
    user.findFirst.mockResolvedValue(null);

    await syncSubscriptionToUser(subscription());

    expect(user.update).not.toHaveBeenCalled();
  });

  it("is idempotent: re-delivering the same event writes the same state", async () => {
    user.findFirst.mockResolvedValue({ id: "user_1" });
    const sub = subscription({ status: "active" });

    await syncSubscriptionToUser(sub);
    await syncSubscriptionToUser(sub);

    expect(user.update).toHaveBeenCalledTimes(2);
    expect(user.update.mock.calls[0][0]).toEqual(user.update.mock.calls[1][0]);
  });
});
