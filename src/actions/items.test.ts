import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit-test the action by mocking its collaborators: the auth session and the
// db query. The Zod schema runs for real (it's the source of truth).
const { auth, createItemQuery, updateItemQuery, deleteItemQuery } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    createItemQuery: vi.fn(),
    updateItemQuery: vi.fn(),
    deleteItemQuery: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({
  auth: () => auth(),
}));

vi.mock("@/lib/db/items", () => ({
  createItem: (data: unknown) => createItemQuery(data),
  updateItem: (id: string, data: unknown) => updateItemQuery(id, data),
  deleteItem: (id: string) => deleteItemQuery(id),
}));

import { createItem, deleteItem, updateItem } from "@/actions/items";

const signedIn = { user: { id: "user_1" } };
const validInput = {
  title: "Title",
  description: "",
  content: "x",
  language: "",
  url: "",
  tags: ["react"],
  collectionIds: ["col_a"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createItem action", () => {
  const createInput = {
    type: "snippet",
    title: "Title",
    description: "",
    content: "x",
    language: "",
    url: "",
    tags: ["react"],
    collectionIds: ["col_a"],
  };

  it("rejects when there is no session (no query)", async () => {
    auth.mockResolvedValue(null);

    const result = await createItem(createInput);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("returns the Zod error for invalid input (no query)", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await createItem({ ...createInput, title: "  " });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/title/i);
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("passes normalized data to the query and returns the created detail", async () => {
    auth.mockResolvedValue(signedIn);
    const detail = { id: "item_new", title: "Title" };
    createItemQuery.mockResolvedValue(detail);

    const result = await createItem(createInput);

    expect(result).toEqual({ success: true, data: detail });
    const [data] = createItemQuery.mock.calls[0];
    expect(data).toMatchObject({
      type: "snippet",
      title: "Title",
      description: null,
      content: "x",
      language: null,
      url: null,
      tags: ["react"],
      // Collection ids are validated and forwarded to the query.
      collectionIds: ["col_a"],
    });
  });

  it("returns an error when the query can't create the item", async () => {
    auth.mockResolvedValue(signedIn);
    createItemQuery.mockResolvedValue(null);

    const result = await createItem(createInput);

    expect(result).toEqual({ success: false, error: "Could not create item." });
  });
});

describe("updateItem action", () => {
  it("rejects when there is no session (no query)", async () => {
    auth.mockResolvedValue(null);

    const result = await updateItem("item_1", validInput);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("returns the Zod error for invalid input (no query)", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await updateItem("item_1", { ...validInput, title: "  " });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/title/i);
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("passes normalized data to the query and returns the updated detail", async () => {
    auth.mockResolvedValue(signedIn);
    const detail = { id: "item_1", title: "Title" };
    updateItemQuery.mockResolvedValue(detail);

    const result = await updateItem("item_1", validInput);

    expect(result).toEqual({ success: true, data: detail });
    const [id, data] = updateItemQuery.mock.calls[0];
    expect(id).toBe("item_1");
    // Empty optional strings normalized to null by the schema before the query.
    expect(data).toMatchObject({
      title: "Title",
      description: null,
      content: "x",
      language: null,
      url: null,
      tags: ["react"],
      // Collection membership is forwarded to the query.
      collectionIds: ["col_a"],
    });
  });

  it("returns an error when the query reports the item missing", async () => {
    auth.mockResolvedValue(signedIn);
    updateItemQuery.mockResolvedValue(null);

    const result = await updateItem("item_1", validInput);

    expect(result).toEqual({ success: false, error: "Item not found." });
  });
});

describe("deleteItem action", () => {
  it("rejects when there is no session (no query)", async () => {
    auth.mockResolvedValue(null);

    const result = await deleteItem("item_1");

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(deleteItemQuery).not.toHaveBeenCalled();
  });

  it("deletes and returns success when the item exists", async () => {
    auth.mockResolvedValue(signedIn);
    deleteItemQuery.mockResolvedValue(true);

    const result = await deleteItem("item_1");

    expect(result).toEqual({ success: true, data: null });
    expect(deleteItemQuery).toHaveBeenCalledWith("item_1");
  });

  it("returns an error when the query reports the item missing", async () => {
    auth.mockResolvedValue(signedIn);
    deleteItemQuery.mockResolvedValue(false);

    const result = await deleteItem("item_1");

    expect(result).toEqual({ success: false, error: "Item not found." });
  });
});
