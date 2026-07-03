import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton and the demo-user resolver so this is a true unit
// test — no database. We assert the create is user-scoped and mapped into the
// DashboardCollection shape. `vi.hoisted` lets the mocks exist before the
// hoisted factories.
const { collection, item } = vi.hoisted(() => ({
  collection: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  item: { findMany: vi.fn(), count: vi.fn() },
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
  deleteCollection,
  getAllCollections,
  getCollectionWithItems,
  getDashboardCollections,
  getPaginatedCollections,
  getSelectableCollections,
  setCollectionFavorite,
  updateCollection,
} from "@/lib/db/collections";
import { COLLECTIONS_PER_PAGE, ITEMS_PER_PAGE } from "@/lib/pagination";
import { FREE_LIMITS, PlanLimitError } from "@/lib/billing/plan";

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

  it("throws PlanLimitError('collection') when a Free user is at the cap", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: false });
    collection.count.mockResolvedValue(FREE_LIMITS.collections);

    await expect(createCollection(data)).rejects.toBeInstanceOf(PlanLimitError);
    // Gated before any write.
    expect(collection.create).not.toHaveBeenCalled();
    expect(collection.count).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });

  it("does not gate a Pro user at (or over) the collection cap", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: true });
    collection.count.mockResolvedValue(FREE_LIMITS.collections + 2);
    collection.create.mockResolvedValue({
      id: "col_new",
      name: "React Patterns",
      description: "Hooks & co.",
      isFavorite: false,
    });

    const result = await createCollection(data);

    expect(result?.id).toBe("col_new");
    expect(collection.create).toHaveBeenCalled();
  });

  it("lets a Free user under the cap create a collection", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: false });
    collection.count.mockResolvedValue(FREE_LIMITS.collections - 1);
    collection.create.mockResolvedValue({
      id: "col_new",
      name: "React Patterns",
      description: "Hooks & co.",
      isFavorite: false,
    });

    const result = await createCollection(data);

    expect(result?.id).toBe("col_new");
  });
});

describe("updateCollection", () => {
  it("returns false when there is no user (no write)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await updateCollection("col_1", {
      name: "X",
      description: null,
    });

    expect(result).toBe(false);
    expect(collection.updateMany).not.toHaveBeenCalled();
  });

  it("updates scoped to the user and returns true when a row changed", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateCollection("col_1", {
      name: "Renamed",
      description: "New desc",
    });

    expect(collection.updateMany).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
      data: { name: "Renamed", description: "New desc" },
    });
    expect(result).toBe(true);
  });

  it("returns false when no row matched (not owned / missing)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateCollection("col_x", {
      name: "Renamed",
      description: null,
    });

    expect(result).toBe(false);
  });
});

describe("deleteCollection", () => {
  it("returns false when there is no user (no delete)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await deleteCollection("col_1");

    expect(result).toBe(false);
    expect(collection.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes scoped to the user and returns true when a row was removed", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCollection("col_1");

    expect(collection.deleteMany).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
    });
    expect(result).toBe(true);
  });

  it("returns false when no row matched (not owned / missing)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteCollection("col_x");

    expect(result).toBe(false);
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
    item.count.mockResolvedValue(1);
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

    // Items are pulled through the ItemCollection join, scoped to the user, one
    // page at a time (skip/take).
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user_1",
          collections: { some: { collectionId: "col_1" } },
        },
        orderBy: { updatedAt: "desc" },
        skip: 0,
        take: ITEMS_PER_PAGE,
      }),
    );
    expect(result).toEqual({
      id: "col_1",
      name: "React Patterns",
      description: "Reusable bits",
      isFavorite: false,
      page: 1,
      totalPages: 1,
      totalCount: 1,
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

  it("clamps a too-high page to the last page and offsets by skip", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.findFirst.mockResolvedValue({
      id: "col_1",
      name: "React Patterns",
      description: null,
      isFavorite: false,
    });
    // 22 items → 2 pages of 21. Requesting page 9 should land on page 2.
    item.count.mockResolvedValue(ITEMS_PER_PAGE + 1);
    item.findMany.mockResolvedValue([]);

    const result = await getCollectionWithItems("col_1", 9);

    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: ITEMS_PER_PAGE, take: ITEMS_PER_PAGE }),
    );
    expect(result).toMatchObject({ page: 2, totalPages: 2, totalCount: 22 });
  });
});

describe("getPaginatedCollections", () => {
  it("returns an empty page without querying when there is no user", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getPaginatedCollections();

    expect(result).toEqual({ items: [], page: 1, totalPages: 1, totalCount: 0 });
    expect(collection.count).not.toHaveBeenCalled();
    expect(collection.findMany).not.toHaveBeenCalled();
  });

  it("fetches only the requested page (count + skip/take) and maps the rows", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    const url = { id: "t_url", name: "url", icon: "Link", color: "#green" };
    collection.count.mockResolvedValue(1);
    collection.findMany.mockResolvedValue([
      {
        id: "col_2",
        name: "Links",
        description: null,
        isFavorite: true,
        items: [{ item: { type: url } }],
      },
    ]);

    const result = await getPaginatedCollections(1);

    expect(collection.count).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        orderBy: { updatedAt: "desc" },
        skip: 0,
        take: COLLECTIONS_PER_PAGE,
      }),
    );
    expect(result).toEqual({
      page: 1,
      totalPages: 1,
      totalCount: 1,
      items: [
        {
          id: "col_2",
          name: "Links",
          description: null,
          isFavorite: true,
          itemCount: 1,
          borderColor: "#green",
          types: [url],
        },
      ],
    });
  });

  it("clamps a too-high page to the last page", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    // 22 collections → 2 pages of 21. Requesting page 5 should land on page 2.
    collection.count.mockResolvedValue(COLLECTIONS_PER_PAGE + 1);
    collection.findMany.mockResolvedValue([]);

    const result = await getPaginatedCollections(5);

    expect(collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: COLLECTIONS_PER_PAGE }),
    );
    expect(result).toMatchObject({ page: 2, totalPages: 2, totalCount: 22 });
  });
});

describe("setCollectionFavorite", () => {
  it("returns false when there is no user (no write)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await setCollectionFavorite("col_1", true);

    expect(result).toBe(false);
    expect(collection.updateMany).not.toHaveBeenCalled();
  });

  it("updates scoped to the user and returns true when a row changed", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.updateMany.mockResolvedValue({ count: 1 });

    const result = await setCollectionFavorite("col_1", true);

    expect(collection.updateMany).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
      data: { isFavorite: true },
    });
    expect(result).toBe(true);
  });

  it("passes the desired state through (unfavorite)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.updateMany.mockResolvedValue({ count: 1 });

    await setCollectionFavorite("col_1", false);

    expect(collection.updateMany.mock.calls[0][0].data).toEqual({
      isFavorite: false,
    });
  });

  it("returns false when no row matched (not owned / missing)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    collection.updateMany.mockResolvedValue({ count: 0 });

    const result = await setCollectionFavorite("col_x", true);

    expect(result).toBe(false);
  });
});
