import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit-test the action by mocking its collaborators: the auth session, the db
// query, and the Prisma error class (so we can simulate the unique-name P2002).
// The Zod schema runs for real (it's the source of truth).
const {
  auth,
  createCollectionQuery,
  updateCollectionQuery,
  deleteCollectionQuery,
  PrismaClientKnownRequestError,
} = vi.hoisted(() => {
  // A minimal stand-in matching the real error's shape: a `code` field and a
  // distinct constructor for `instanceof` checks.
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, opts: { code: string }) {
      super(message);
      this.code = opts.code;
    }
  }
  return {
    auth: vi.fn(),
    createCollectionQuery: vi.fn(),
    updateCollectionQuery: vi.fn(),
    deleteCollectionQuery: vi.fn(),
    PrismaClientKnownRequestError,
  };
});

vi.mock("@/auth", () => ({
  auth: () => auth(),
}));

vi.mock("@/lib/db/collections", () => ({
  createCollection: (data: unknown) => createCollectionQuery(data),
  updateCollection: (id: string, data: unknown) =>
    updateCollectionQuery(id, data),
  deleteCollection: (id: string) => deleteCollectionQuery(id),
}));

vi.mock("@/generated/prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError },
}));

import {
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/actions/collections";

const signedIn = { user: { id: "user_1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCollection action", () => {
  it("rejects when there is no session (no query)", async () => {
    auth.mockResolvedValue(null);

    const result = await createCollection({ name: "X" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(createCollectionQuery).not.toHaveBeenCalled();
  });

  it("returns the Zod error for invalid input (no query)", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await createCollection({ name: "  " });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/name/i);
    expect(createCollectionQuery).not.toHaveBeenCalled();
  });

  it("passes normalized data to the query and returns the created collection", async () => {
    auth.mockResolvedValue(signedIn);
    const created = { id: "col_new", name: "React Patterns" };
    createCollectionQuery.mockResolvedValue(created);

    const result = await createCollection({
      name: "  React Patterns  ",
      description: "  ",
    });

    expect(result).toEqual({ success: true, data: created });
    const [data] = createCollectionQuery.mock.calls[0];
    // Name trimmed; empty description normalized to null by the schema.
    expect(data).toEqual({ name: "React Patterns", description: null });
  });

  it("returns an error when the query can't create the collection", async () => {
    auth.mockResolvedValue(signedIn);
    createCollectionQuery.mockResolvedValue(null);

    const result = await createCollection({ name: "X" });

    expect(result).toEqual({
      success: false,
      error: "Could not create collection.",
    });
  });

  it("turns a duplicate-name P2002 into a friendly message", async () => {
    auth.mockResolvedValue(signedIn);
    createCollectionQuery.mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
      }),
    );

    const result = await createCollection({ name: "Dupe" });

    expect(result).toEqual({
      success: false,
      error: "A collection with that name already exists.",
    });
  });

  it("returns a generic error for an unexpected failure", async () => {
    auth.mockResolvedValue(signedIn);
    createCollectionQuery.mockRejectedValue(new Error("boom"));

    const result = await createCollection({ name: "X" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("updateCollection action", () => {
  it("rejects when there is no session (no query)", async () => {
    auth.mockResolvedValue(null);

    const result = await updateCollection("col_1", { name: "X" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(updateCollectionQuery).not.toHaveBeenCalled();
  });

  it("returns the Zod error for invalid input (no query)", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await updateCollection("col_1", { name: "  " });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/name/i);
    expect(updateCollectionQuery).not.toHaveBeenCalled();
  });

  it("passes the id + normalized data to the query and succeeds", async () => {
    auth.mockResolvedValue(signedIn);
    updateCollectionQuery.mockResolvedValue(true);

    const result = await updateCollection("col_1", {
      name: "  Renamed  ",
      description: "  ",
    });

    expect(result).toEqual({ success: true, data: null });
    const [id, data] = updateCollectionQuery.mock.calls[0];
    expect(id).toBe("col_1");
    expect(data).toEqual({ name: "Renamed", description: null });
  });

  it("returns not-found when the query reports no row changed", async () => {
    auth.mockResolvedValue(signedIn);
    updateCollectionQuery.mockResolvedValue(false);

    const result = await updateCollection("col_x", { name: "X" });

    expect(result).toEqual({ success: false, error: "Collection not found." });
  });

  it("turns a duplicate-name P2002 into a friendly message", async () => {
    auth.mockResolvedValue(signedIn);
    updateCollectionQuery.mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
      }),
    );

    const result = await updateCollection("col_1", { name: "Dupe" });

    expect(result).toEqual({
      success: false,
      error: "A collection with that name already exists.",
    });
  });
});

describe("deleteCollection action", () => {
  it("rejects when there is no session (no query)", async () => {
    auth.mockResolvedValue(null);

    const result = await deleteCollection("col_1");

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(deleteCollectionQuery).not.toHaveBeenCalled();
  });

  it("deletes and returns success when the query removed a row", async () => {
    auth.mockResolvedValue(signedIn);
    deleteCollectionQuery.mockResolvedValue(true);

    const result = await deleteCollection("col_1");

    expect(deleteCollectionQuery).toHaveBeenCalledWith("col_1");
    expect(result).toEqual({ success: true, data: null });
  });

  it("returns not-found when the query reports nothing deleted", async () => {
    auth.mockResolvedValue(signedIn);
    deleteCollectionQuery.mockResolvedValue(false);

    const result = await deleteCollection("col_x");

    expect(result).toEqual({ success: false, error: "Collection not found." });
  });

  it("returns a generic error for an unexpected failure", async () => {
    auth.mockResolvedValue(signedIn);
    deleteCollectionQuery.mockRejectedValue(new Error("boom"));

    const result = await deleteCollection("col_1");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
