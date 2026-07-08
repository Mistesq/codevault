import { beforeEach, describe, expect, it, vi } from "vitest";

// Server actions are unit-tested by mocking their collaborators: the auth
// session, the Prisma singleton, and the Stripe client. No real session, DB, or
// network. `vi.hoisted` makes these available to the hoisted `vi.mock` factories.
const { auth, user, checkoutCreate, portalCreate, stripeConfigured } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    user: { findUnique: vi.fn() },
    checkoutCreate: vi.fn(),
    portalCreate: vi.fn(),
    stripeConfigured: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: () => auth() }));

vi.mock("@/lib/prisma", () => ({ prisma: { user } }));

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: (args: unknown) => checkoutCreate(args) } },
    billingPortal: {
      sessions: { create: (args: unknown) => portalCreate(args) },
    },
  }),
  isStripeConfigured: () => stripeConfigured(),
}));

import { createCheckoutSession, createPortalSession } from "@/actions/billing";

const signedIn = { user: { id: "user_1" } };

beforeEach(() => {
  vi.clearAllMocks();
  // Configured + signed-in is the common baseline; individual tests override.
  stripeConfigured.mockReturnValue(true);
  process.env.STRIPE_PRICE_MONTHLY = "price_monthly_123";
  process.env.STRIPE_PRICE_YEARLY = "price_yearly_456";
});

describe("createCheckoutSession", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await createCheckoutSession({ interval: "monthly" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when Stripe is not configured", async () => {
    auth.mockResolvedValue(signedIn);
    stripeConfigured.mockReturnValue(false);

    const result = await createCheckoutSession({ interval: "monthly" });

    expect(result).toEqual({
      success: false,
      error: "Billing is not configured.",
    });
    expect(user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an invalid interval", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await createCheckoutSession({ interval: "weekly" });

    expect(result).toEqual({ success: false, error: "Invalid plan." });
  });

  it("rejects an already-Pro user", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      email: "a@b.com",
      isPro: true,
      stripeCustomerId: null,
    });

    const result = await createCheckoutSession({ interval: "monthly" });

    expect(result).toEqual({ success: false, error: "You're already Pro." });
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("rejects the demo account before touching Stripe", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      email: "demo@codevault.io",
      isPro: false,
      stripeCustomerId: null,
      isDemo: true,
    });

    const result = await createCheckoutSession({ interval: "monthly" });

    expect(result).toEqual({
      success: false,
      error: "This action is disabled on the demo account.",
    });
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("returns the checkout url on the happy path (new customer)", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      email: "a@b.com",
      isPro: false,
      stripeCustomerId: null,
    });
    checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe/session" });

    const result = await createCheckoutSession({ interval: "yearly" });

    expect(result).toEqual({
      success: true,
      data: { url: "https://checkout.stripe/session" },
    });
    const args = checkoutCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(args.mode).toBe("subscription");
    expect(args.client_reference_id).toBe("user_1");
    expect(args.customer_email).toBe("a@b.com");
    expect(args.customer).toBeUndefined();
    expect(args.line_items).toEqual([
      { price: "price_yearly_456", quantity: 1 },
    ]);
  });

  it("reuses the saved stripeCustomerId when present", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      email: "a@b.com",
      isPro: false,
      stripeCustomerId: "cus_existing",
    });
    checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe/session" });

    await createCheckoutSession({ interval: "monthly" });

    const args = checkoutCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(args.customer).toBe("cus_existing");
    expect(args.customer_email).toBeUndefined();
  });

  it("returns a generic error when Stripe throws", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      email: "a@b.com",
      isPro: false,
      stripeCustomerId: null,
    });
    checkoutCreate.mockRejectedValue(new Error("stripe down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createCheckoutSession({ interval: "monthly" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    errorSpy.mockRestore();
  });
});

describe("createPortalSession", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await createPortalSession();

    expect(result).toEqual({ success: false, error: "You must be signed in." });
  });

  it("rejects when Stripe is not configured", async () => {
    auth.mockResolvedValue(signedIn);
    stripeConfigured.mockReturnValue(false);

    const result = await createPortalSession();

    expect(result).toEqual({
      success: false,
      error: "Billing is not configured.",
    });
  });

  it("rejects when the user has no stripeCustomerId", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ stripeCustomerId: null });

    const result = await createPortalSession();

    expect(result).toEqual({
      success: false,
      error: "No active subscription found.",
    });
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it("rejects the demo account before touching Stripe", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      isDemo: true,
    });

    const result = await createPortalSession();

    expect(result).toEqual({
      success: false,
      error: "This action is disabled on the demo account.",
    });
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it("returns the portal url on the happy path", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });
    portalCreate.mockResolvedValue({ url: "https://portal.stripe/session" });

    const result = await createPortalSession();

    expect(result).toEqual({
      success: true,
      data: { url: "https://portal.stripe/session" },
    });
    const args = portalCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(args.customer).toBe("cus_existing");
  });
});
