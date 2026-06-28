import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton so these are true unit tests — no database. We assert
// against the arguments the helpers pass to Prisma and drive return values to
// exercise the success / expired / invalid branches. `vi.hoisted` lets the mock
// objects exist before the hoisted `vi.mock` factory references them.
const { verificationToken, user } = vi.hoisted(() => ({
  verificationToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { verificationToken, user },
}));

import {
  consumeVerificationToken,
  createVerificationToken,
} from "@/lib/auth/verification-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createVerificationToken", () => {
  it("invalidates prior tokens and stores a hashed token under the raw email", async () => {
    verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    verificationToken.create.mockResolvedValue({});

    const raw = await createVerificationToken("user@example.com");

    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "user@example.com" },
    });

    const createArg = verificationToken.create.mock.calls[0][0];
    expect(createArg.data.identifier).toBe("user@example.com");
    expect(createArg.data.token).not.toBe(raw);
    expect(createArg.data.token).toMatch(/^[0-9a-f]{64}$/);
    expect(createArg.data.expires).toBeInstanceOf(Date);
    expect(createArg.data.expires.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("consumeVerificationToken", () => {
  it("excludes password-reset-namespaced tokens from the lookup", async () => {
    verificationToken.findFirst.mockResolvedValue(null);

    await consumeVerificationToken("whatever");

    const whereArg = verificationToken.findFirst.mock.calls[0][0].where;
    expect(whereArg.identifier).toEqual({
      not: { startsWith: "password-reset:" },
    });
  });

  it("returns invalid (and deletes nothing) when no matching token exists", async () => {
    verificationToken.findFirst.mockResolvedValue(null);

    const result = await consumeVerificationToken("whatever");

    expect(result).toBe("invalid");
    expect(verificationToken.deleteMany).not.toHaveBeenCalled();
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("deletes the token (single use) and returns expired for a stale token", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "user@example.com",
      token: "hashed",
      expires: new Date(Date.now() - 1000),
    });
    verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    const result = await consumeVerificationToken("rawtoken");

    expect(result).toBe("expired");
    expect(verificationToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("marks the email verified and consumes the token for a valid token", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "user@example.com",
      token: "hashed",
      expires: new Date(Date.now() + 60_000),
    });
    verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    user.updateMany.mockResolvedValue({ count: 1 });

    const result = await consumeVerificationToken("rawtoken");

    expect(result).toBe("success");
    expect(verificationToken.deleteMany).toHaveBeenCalledTimes(1);
    const updateArg = user.updateMany.mock.calls[0][0];
    expect(updateArg.where).toEqual({ email: "user@example.com" });
    expect(updateArg.data.emailVerified).toBeInstanceOf(Date);
  });
});
