import { beforeEach, describe, expect, it, vi } from "vitest";

// Server actions are unit-tested by mocking their collaborators: the auth
// session, the Prisma singleton, and bcrypt. No real session, DB, or hashing.
// `vi.hoisted` makes these mocks available to the hoisted `vi.mock` factories.
const { auth, signOut, user, bcryptCompare, bcryptHash } = vi.hoisted(() => ({
  auth: vi.fn(),
  signOut: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: () => auth(),
  signOut: (opts: unknown) => signOut(opts),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (a: string, b: string) => bcryptCompare(a, b),
    hash: (a: string, cost: number) => bcryptHash(a, cost),
  },
}));

import { changePassword, deleteAccount } from "@/actions/profile";

const signedIn = { user: { id: "user_1" } };
const validChange = {
  currentPassword: "oldpass",
  newPassword: "newsecret",
  confirmPassword: "newsecret",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("changePassword", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await changePassword(validChange);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid input with the schema's message", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await changePassword({
      currentPassword: "",
      newPassword: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects accounts that have no password (OAuth-only)", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ password: null });

    const result = await changePassword(validChange);

    expect(result).toEqual({
      success: false,
      error: "Password changes aren't available for this account.",
    });
    expect(user.update).not.toHaveBeenCalled();
  });

  it("rejects an incorrect current password", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ password: "stored-hash" });
    bcryptCompare.mockResolvedValue(false);

    const result = await changePassword(validChange);

    expect(result).toEqual({
      success: false,
      error: "Current password is incorrect.",
    });
    expect(user.update).not.toHaveBeenCalled();
  });

  it("hashes and stores the new password on success", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ password: "stored-hash" });
    bcryptCompare.mockResolvedValue(true);
    bcryptHash.mockResolvedValue("new-hash");
    user.update.mockResolvedValue({});

    const result = await changePassword(validChange);

    expect(result).toEqual({ success: true });
    expect(bcryptHash).toHaveBeenCalledWith("newsecret", 12);
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { password: "new-hash" },
    });
  });

  it("returns a generic error when Prisma throws", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockRejectedValue(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await changePassword(validChange);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    errorSpy.mockRestore();
  });
});

describe("deleteAccount", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await deleteAccount("DELETE");

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(user.delete).not.toHaveBeenCalled();
  });

  it("requires the literal DELETE confirmation", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await deleteAccount("delete");

    expect(result).toEqual({ success: false, error: 'Type "DELETE" to confirm.' });
    expect(user.delete).not.toHaveBeenCalled();
  });

  it("deletes only the caller's own account, then signs out", async () => {
    auth.mockResolvedValue(signedIn);
    user.delete.mockResolvedValue({});
    signOut.mockResolvedValue(undefined);

    const result = await deleteAccount("DELETE");

    expect(user.delete).toHaveBeenCalledWith({ where: { id: "user_1" } });
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
    expect(result).toEqual({ success: true });
  });

  it("returns a generic error and skips sign-out when delete throws", async () => {
    auth.mockResolvedValue(signedIn);
    user.delete.mockRejectedValue(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deleteAccount("DELETE");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(signOut).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
