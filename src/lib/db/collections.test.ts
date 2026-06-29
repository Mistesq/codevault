import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton and the demo-user resolver so this is a true unit
// test — no database. We assert the create is user-scoped and mapped into the
// DashboardCollection shape. `vi.hoisted` lets the mocks exist before the
// hoisted factories.
const { collection, item } = vi.hoisted(() => ({
  collection: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  item: { findMany: vi.fn() },
}));
const { getSessionUser } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { collection, item },
}));
vi.mock("@/lib/db/user", () => ({
  getSessionUser,
}));

import {
  createCollection,
  getAllCollections,
  getCollectionWithItems,
  getDashboardCollections,
  getSelectableCollections,
} from "@/lib/db/collections";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCollection", () => {
  const data = { name: "React Patterns", description: "Hooks & co." };

  it("returns null when there is no demo user (no write)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await createCollection(data);

    expect(result).toBeNull();
    expect(collection.create).not.toHaveBeenCalled();
  });

  it("creates the collection scoped to the demo user", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.create.mockResolvedValue({
      id: "col_new",
      name: "React Patterns",
      description: "Hooks & co.",
      isFavorite: false,
    });

    const result = await createCollection(data);

    expect(collection.create).toHaveBeenCalledWith({
      data: {
        name: "React Patterns",
        description: "Hooks & co.",
        userId: "user_1",
      },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    // Mapped into the DashboardCollection shape — empty, no items yet.
    expect(result).toEqual({
      id: "col_new",
      name: "React Patterns",
      description: "Hooks & co.",
      isFavorite: false,
      itemCount: 0,
      borderColor: null,
      types: [],
    });
  });

  it("passes a null description straight through", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.create.mockResolvedValue({
      id: "col_2",
      name: "Solo",
      description: null,
      isFavorite: false,
    });

    const result = await createCollection({ name: "Solo", description: null });

    expect(collection.create.mock.calls[0][0].data.description).toBeNull();
    expect(result?.description).toBeNull();
  });
});

describe("getSelectableCollections", () => {
  it("returns [] when there is no demo user (no query)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getSelectableCollections();

    expect(result).toEqual([]);
    expect(collection.findMany).not.toHaveBeenCalled();
  });

  it("returns the demo user's collections (id + name), alphabetical", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.findMany.mockResolvedValue([
      { id: "col_a", name: "Alpha" },
      { id: "col_b", name: "Beta" },
    ]);

    const result = await getSelectableCollections();

    expect(collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    expect(result).toEqual([
      { id: "col_a", name: "Alpha" },
      { id: "col_b", name: "Beta" },
    ]);
  });
});

describe("getDashboardCollections", () => {
  it("counts items via the join and derives the border from the most-used type", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    const snippet = { id: "t_snip", name: "snippet", icon: "Code", color: "#blue" };
    const note = { id: "t_note", name: "note", icon: "StickyNote", color: "#yellow" };
    // Two snippets + one note → border color is the snippet's (most-used).
    collection.findMany.mockResolvedValue([
      {
        id: "col_1",
        name: "React Patterns",
        description: "Reusable bits",
        isFavorite: false,
        items: [
          { item: { type: snippet } },
          { item: { type: snippet } },
          { item: { type: note } },
        ],
      },
    ]);

    const result = await getDashboardCollections();

    expect(result).toEqual([
      {
        id: "col_1",
        name: "React Patterns",
        description: "Reusable bits",
        isFavorite: false,
        itemCount: 3,
        borderColor: "#blue",
        types: [snippet, note],
      },
    ]);
  });
});

describe("getAllCollections", () => {
  it("returns [] when there is no user (no query)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getAllCollections();

    expect(result).toEqual([]);
    expect(collection.findMany).not.toHaveBeenCalled();
  });

  it("queries the user's collections newest-first and unbounded (no take)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.findMany.mockResolvedValue([]);

    await getAllCollections();

    expect(collection.findMany).toHaveBeenCalledTimes(1);
    const arg = collection.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: "user_1" });
    expect(arg.orderBy).toEqual({ updatedAt: "desc" });
    // The whole point vs. getDashboardCollections: no row limit.
    expect(arg.take).toBeUndefined();
  });

  it("maps each collection through the shared DashboardCollection mapper", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    const url = { id: "t_url", name: "url", icon: "Link", color: "#green" };
    collection.findMany.mockResolvedValue([
      {
        id: "col_2",
        name: "Links",
        description: null,
        isFavorite: true,
        items: [{ item: { type: url } }],
      },
    ]);

    const result = await getAllCollections();

    expect(result).toEqual([
      {
        id: "col_2",
        name: "Links",
        description: null,
        isFavorite: true,
        itemCount: 1,
        borderColor: "#green",
        types: [url],
      },
    ]);
  });
});

describe("getCollectionWithItems", () => {
  it("returns null when there is no user (no queries)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getCollectionWithItems("col_1");

    expect(result).toBeNull();
    expect(collection.findFirst).not.toHaveBeenCalled();
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("returns null when the collection isn't the user's (no item query)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.findFirst.mockResolvedValue(null);

    const result = await getCollectionWithItems("col_x");

    expect(collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col_x", userId: "user_1" },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    expect(result).toBeNull();
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("returns the collection with its items mapped into DashboardItem shape", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.findFirst.mockResolvedValue({
      id: "col_1",
      name: "React Patterns",
      description: "Reusable bits",
      isFavorite: false,
    });
    item.findMany.mockResolvedValue([
      {
        id: "item_1",
        title: "useDebounce",
        description: "A debounce hook",
        contentType: "TEXT",
        content: "export const useDebounce = () => {}",
        fileUrl: null,
        fileName: null,
        fileSize: null,
        url: null,
        isFavorite: false,
        isPinned: true,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        type: { name: "snippet", icon: "Code", color: "#blue" },
        tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
      },
    ]);

    const result = await getCollectionWithItems("col_1");

    // Items are pulled through the ItemCollection join, scoped to the user.
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user_1",
          collections: { some: { collectionId: "col_1" } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    );
    expect(result).toEqual({
      id: "col_1",
      name: "React Patterns",
      description: "Reusable bits",
      isFavorite: false,
      items: [
        {
          id: "item_1",
          title: "useDebounce",
          description: "A debounce hook",
          contentType: "TEXT",
          content: "export const useDebounce = () => {}",
          fileUrl: null,
          fileName: null,
          fileSize: null,
          url: null,
          isFavorite: false,
          isPinned: true,
          tags: ["react", "hooks"],
          updatedAt: "2026-01-01T00:00:00.000Z",
          type: { name: "snippet", icon: "Code", color: "#blue" },
        },
      ],
    });
  });
});
