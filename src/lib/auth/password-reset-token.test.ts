import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton so these are true unit tests — no database. We assert
// against the arguments the helpers pass to Prisma and drive return values to
// exercise the success / expired / invalid branches. `vi.hoisted` lets the mock
// object exist before the hoisted `vi.mock` factory references it.
const { verificationToken } = vi.hoisted(() => ({
  verificationToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { verificationToken },
}));

import {
  consumePasswordResetToken,
  createPasswordResetToken,
} from "@/lib/auth/password-reset-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPasswordResetToken", () => {
  it("invalidates prior reset tokens and stores a hashed, namespaced token", async () => {
    verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    verificationToken.create.mockResolvedValue({});

    const raw = await createPasswordResetToken("user@example.com");

    // Returns a raw token (hex) to embed in the link.
    expect(raw).toMatch(/^[0-9a-f]{64}$/);

    // Old tokens for this namespaced identifier are dropped first.
    expect(verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "password-reset:user@example.com" },
    });

    // The stored token is a hash, never the raw token, under the namespaced id.
    const createArg = verificationToken.create.mock.calls[0][0];
    expect(createArg.data.identifier).toBe("password-reset:user@example.com");
    expect(createArg.data.token).not.toBe(raw);
    expect(createArg.data.token).toMatch(/^[0-9a-f]{64}$/);
    expect(createArg.data.expires).toBeInstanceOf(Date);
    expect(createArg.data.expires.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("consumePasswordResetToken", () => {
  it("returns invalid (and deletes nothing) when no matching token exists", async () => {
    verificationToken.findFirst.mockResolvedValue(null);

    const result = await consumePasswordResetToken("whatever");

    expect(result).toEqual({ status: "invalid", email: null });
    expect(verificationToken.deleteMany).not.toHaveBeenCalled();
  });

  it("only matches tokens within the password-reset namespace", async () => {
    verificationToken.findFirst.mockResolvedValue(null);

    await consumePasswordResetToken("whatever");

    const whereArg = verificationToken.findFirst.mock.calls[0][0].where;
    expect(whereArg.identifier).toEqual({ startsWith: "password-reset:" });
  });

  it("deletes the token (single use) and returns expired for a stale token", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "password-reset:user@example.com",
      token: "hashed",
      expires: new Date(Date.now() - 1000),
    });
    verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    const result = await consumePasswordResetToken("rawtoken");

    expect(result).toEqual({ status: "expired", email: null });
    expect(verificationToken.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("returns success with the target email for a valid token, and consumes it", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "password-reset:user@example.com",
      token: "hashed",
      expires: new Date(Date.now() + 60_000),
    });
    verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    const result = await consumePasswordResetToken("rawtoken");

    expect(result).toEqual({ status: "success", email: "user@example.com" });
    expect(verificationToken.deleteMany).toHaveBeenCalledTimes(1);
  });
});
