import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton and the demo-user resolver so this is a true unit
// test — no database. We assert the where-clause is user-scoped and that rows
// are mapped into the ItemDetail shape (ISO dates, tag names, collection
// passthrough). `vi.hoisted` lets the mocks exist before the hoisted factories.
const { item, itemType, itemTag, tag, $transaction } = vi.hoisted(() => {
  const item = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  };
  const itemType = { findFirst: vi.fn() };
  const itemTag = { deleteMany: vi.fn(), create: vi.fn() };
  const tag = { upsert: vi.fn() };
  // Run the transaction callback against the same mocked delegates.
  const $transaction = vi.fn((cb: (tx: unknown) => unknown) =>
    cb({ item, itemTag, tag }),
  );
  return { item, itemType, itemTag, tag, $transaction };
});
const { getDemoUser } = vi.hoisted(() => ({
  getDemoUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { item, itemType, itemTag, tag, $transaction },
}));
vi.mock("@/lib/db/user", () => ({
  getDemoUser,
}));

import { createItem, deleteItem, getItemDetail, updateItem } from "@/lib/db/items";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItemDetail", () => {
  it("returns null when there is no demo user (no query)", async () => {
    getDemoUser.mockResolvedValue(null);

    const result = await getItemDetail("item_1");

    expect(result).toBeNull();
    expect(item.findFirst).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the demo user and the given id", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue(null);

    const result = await getItemDetail("item_1");

    expect(result).toBeNull();
    const arg = item.findFirst.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "item_1", userId: "user_1" });
  });

  it("maps a row into the ItemDetail shape (ISO dates, tags, collection)", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    const updatedAt = new Date("2026-01-02T03:04:05.000Z");
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    item.findFirst.mockResolvedValue({
      id: "item_1",
      title: "useDebounce hook",
      description: "Debounce a value.",
      contentType: "TEXT",
      content: "export function useDebounce() {}",
      fileName: null,
      fileSize: null,
      url: null,
      isFavorite: true,
      isPinned: false,
      updatedAt,
      createdAt,
      language: "tsx",
      type: { name: "snippet", icon: "Code", color: "#abc" },
      collection: { id: "col_1", name: "React Patterns" },
      tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
    });

    const result = await getItemDetail("item_1");

    expect(result).toEqual({
      id: "item_1",
      title: "useDebounce hook",
      description: "Debounce a value.",
      contentType: "TEXT",
      content: "export function useDebounce() {}",
      fileName: null,
      fileSize: null,
      url: null,
      isFavorite: true,
      isPinned: false,
      tags: ["react", "hooks"],
      updatedAt: "2026-01-02T03:04:05.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      language: "tsx",
      type: { name: "snippet", icon: "Code", color: "#abc" },
      collection: { id: "col_1", name: "React Patterns" },
    });
  });

  it("passes through a null collection", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue({
      id: "item_2",
      title: "Standalone",
      description: null,
      contentType: "TEXT",
      content: "x",
      fileName: null,
      fileSize: null,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T03:04:05.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: null,
      type: { name: "note", icon: "StickyNote", color: null },
      collection: null,
      tags: [],
    });

    const result = await getItemDetail("item_2");

    expect(result?.collection).toBeNull();
    expect(result?.tags).toEqual([]);
  });
});

describe("updateItem", () => {
  const data = {
    title: "New title",
    description: "desc",
    content: "x",
    url: null,
    language: "tsx",
    tags: ["react", "hooks"],
  };

  it("returns null when there is no demo user (no writes)", async () => {
    getDemoUser.mockResolvedValue(null);

    const result = await updateItem("item_1", data);

    expect(result).toBeNull();
    expect(item.findFirst).not.toHaveBeenCalled();
    expect($transaction).not.toHaveBeenCalled();
  });

  it("returns null without writing when the item isn't the demo user's", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue(null);

    const result = await updateItem("item_x", data);

    expect(result).toBeNull();
    // Ownership lookup scoped to the demo user; no transaction attempted.
    expect(item.findFirst.mock.calls[0][0].where).toEqual({
      id: "item_x",
      userId: "user_1",
    });
    expect($transaction).not.toHaveBeenCalled();
  });

  it("updates fields, replaces tags (disconnect + connect-or-create), then re-reads", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    // First findFirst = ownership check; second = getItemDetail re-read.
    item.findFirst
      .mockResolvedValueOnce({ id: "item_1" })
      .mockResolvedValueOnce({
        id: "item_1",
        title: "New title",
        description: "desc",
        contentType: "TEXT",
        content: "x",
        fileName: null,
        fileSize: null,
        url: null,
        isFavorite: false,
        isPinned: false,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        language: "tsx",
        type: { name: "snippet", icon: "Code", color: null },
        collection: null,
        tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
      });
    tag.upsert
      .mockResolvedValueOnce({ id: "tag_react" })
      .mockResolvedValueOnce({ id: "tag_hooks" });

    const result = await updateItem("item_1", data);

    // Item fields written (no tags on the item update itself).
    expect(item.update).toHaveBeenCalledWith({
      where: { id: "item_1" },
      data: {
        title: "New title",
        description: "desc",
        content: "x",
        url: null,
        language: "tsx",
      },
    });
    // All existing links cleared first.
    expect(itemTag.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "item_1" },
    });
    // Each tag upserted scoped to the user, then linked.
    expect(tag.upsert).toHaveBeenCalledTimes(2);
    expect(tag.upsert.mock.calls[0][0].where).toEqual({
      userId_name: { userId: "user_1", name: "react" },
    });
    expect(itemTag.create).toHaveBeenCalledWith({
      data: { itemId: "item_1", tagId: "tag_react" },
    });
    // Returns the freshly re-read ItemDetail.
    expect(result?.title).toBe("New title");
    expect(result?.tags).toEqual(["react", "hooks"]);
  });
});

describe("createItem", () => {
  const data = {
    type: "snippet",
    title: "New snippet",
    description: "desc",
    content: "x",
    url: null,
    language: "tsx",
    tags: ["react"],
  };

  it("returns null when there is no demo user (no writes)", async () => {
    getDemoUser.mockResolvedValue(null);

    const result = await createItem(data);

    expect(result).toBeNull();
    expect(itemType.findFirst).not.toHaveBeenCalled();
    expect($transaction).not.toHaveBeenCalled();
  });

  it("returns null when the type doesn't resolve (no writes)", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    itemType.findFirst.mockResolvedValue(null);

    const result = await createItem({ ...data, type: "bogus" });

    expect(result).toBeNull();
    expect(itemType.findFirst.mock.calls[0][0].where).toEqual({
      isSystem: true,
      name: "bogus",
    });
    expect($transaction).not.toHaveBeenCalled();
  });

  it("creates the item (TEXT, user+type scoped), links tags, then re-reads", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    itemType.findFirst.mockResolvedValue({ id: "type_snippet" });
    item.create.mockResolvedValue({ id: "item_new" });
    tag.upsert.mockResolvedValueOnce({ id: "tag_react" });
    // getItemDetail re-read at the end.
    item.findFirst.mockResolvedValue({
      id: "item_new",
      title: "New snippet",
      description: "desc",
      contentType: "TEXT",
      content: "x",
      fileName: null,
      fileSize: null,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: "tsx",
      type: { name: "snippet", icon: "Code", color: null },
      collection: null,
      tags: [{ tag: { name: "react" } }],
    });

    const result = await createItem(data);

    expect(item.create).toHaveBeenCalledWith({
      data: {
        title: "New snippet",
        description: "desc",
        content: "x",
        url: null,
        language: "tsx",
        contentType: "TEXT",
        userId: "user_1",
        typeId: "type_snippet",
      },
      select: { id: true },
    });
    expect(tag.upsert.mock.calls[0][0].where).toEqual({
      userId_name: { userId: "user_1", name: "react" },
    });
    expect(itemTag.create).toHaveBeenCalledWith({
      data: { itemId: "item_new", tagId: "tag_react" },
    });
    expect(result?.id).toBe("item_new");
    expect(result?.tags).toEqual(["react"]);
  });
});

describe("deleteItem", () => {
  it("returns false when there is no demo user (no delete)", async () => {
    getDemoUser.mockResolvedValue(null);

    const result = await deleteItem("item_1");

    expect(result).toBe(false);
    expect(item.deleteMany).not.toHaveBeenCalled();
  });

  it("scopes the delete to the demo user and returns true when a row is removed", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    item.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteItem("item_1");

    expect(result).toBe(true);
    expect(item.deleteMany).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1" },
    });
  });

  it("returns false when no row matched (unknown or foreign id)", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    item.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteItem("item_x");

    expect(result).toBe(false);
  });
});
