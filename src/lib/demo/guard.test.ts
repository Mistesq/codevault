import { beforeEach, describe, expect, it, vi } from "vitest";

// isDemoUser reads the flag straight from the database record — mock the
// Prisma singleton, no real DB.
const { user } = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user } }));

import { DEMO_ACCOUNT_ERROR, isDemoUser } from "@/lib/demo/guard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isDemoUser", () => {
  it("returns true for the demo account", async () => {
    user.findUnique.mockResolvedValue({ isDemo: true });

    await expect(isDemoUser("demo_1")).resolves.toBe(true);
  });

  it("returns false for a regular account", async () => {
    user.findUnique.mockResolvedValue({ isDemo: false });

    await expect(isDemoUser("user_1")).resolves.toBe(false);
  });

  it("returns false when the user no longer exists", async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(isDemoUser("ghost")).resolves.toBe(false);
  });

  it("resolves the flag by user id from the database, never client input", async () => {
    user.findUnique.mockResolvedValue({ isDemo: true });

    await isDemoUser("user_1");

    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { isDemo: true },
    });
  });
});

describe("DEMO_ACCOUNT_ERROR", () => {
  it("matches the message the guarded actions return", () => {
    expect(DEMO_ACCOUNT_ERROR).toBe(
      "This action is disabled on the demo account.",
    );
  });
});
