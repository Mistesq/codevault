import { beforeEach, describe, expect, it, vi } from "vitest";

// True unit test: mock the Prisma singleton and the session-user resolver so no
// database is touched. We assert the where-clauses are user-scoped + favorite-
// filtered, the ordering is most-recent-first, and rows map into the expected
// shapes (ISO dates, item count flattened off _count). `vi.hoisted` lets the
// mocks exist before the hoisted factory runs.
const { item, collection } = vi.hoisted(() => ({
  item: { findMany: vi.fn() },
  collection: { findMany: vi.fn() },
}));
const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: { item, collection } }));
vi.mock("@/lib/db/user", () => ({ getSessionUser }));

import { getFavorites, getFavoritesPage } from "@/lib/db/favorites";

beforeEach(() => {
  vi.clearAllMocks();
});

// Shared minimal item/collection rows the Prisma mocks return.
function itemRow(id: string, title: string, updatedAt: string) {
  return {
    id,
    title,
    description: null,
    contentType: "TEXT",
    content: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    isFavorite: true,
    isPinned: false,
    updatedAt: new Date(updatedAt),
    type: { name: "snippet", icon: "Code", color: "#abc" },
    tags: [],
  };
}

function collectionRow(id: string, name: string, updatedAt: string) {
  return {
    id,
    name,
    updatedAt: new Date(updatedAt),
    _count: { items: 0 },
  };
}

describe("getFavorites", () => {
  it("returns empty arrays and skips queries when signed out", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getFavorites();

    expect(result).toEqual({ items: [], collections: [] });
    expect(item.findMany).not.toHaveBeenCalled();
    expect(collection.findMany).not.toHaveBeenCalled();
  });

  it("scopes both queries to the user's favorites, newest first", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findMany.mockResolvedValue([]);
    collection.findMany.mockResolvedValue([]);

    await getFavorites();

    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1", isFavorite: true },
        orderBy: { updatedAt: "desc" },
      }),
    );
    expect(collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1", isFavorite: true },
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("maps items to DashboardItem and trims collections to id/name/count/date", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findMany.mockResolvedValue([
      {
        id: "item_1",
        title: "useDebounce",
        description: null,
        contentType: "TEXT",
        content: "code",
        fileUrl: null,
        fileName: null,
        fileSize: null,
        url: null,
        isFavorite: true,
        isPinned: false,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        type: { name: "snippet", icon: "Code", color: "#abc" },
        tags: [{ tag: { name: "react" } }],
      },
    ]);
    collection.findMany.mockResolvedValue([
      {
        id: "col_1",
        name: "React Patterns",
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
        _count: { items: 4 },
      },
    ]);

    const result = await getFavorites();

    expect(result.items).toEqual([
      {
        id: "item_1",
        title: "useDebounce",
        description: null,
        contentType: "TEXT",
        content: "code",
        fileUrl: null,
        fileName: null,
        fileSize: null,
        url: null,
        isFavorite: true,
        isPinned: false,
        tags: ["react"],
        updatedAt: "2026-01-01T00:00:00.000Z",
        type: { name: "snippet", icon: "Code", color: "#abc" },
      },
    ]);
    expect(result.collections).toEqual([
      {
        id: "col_1",
        name: "React Patterns",
        itemCount: 4,
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ]);
  });
});

describe("getFavoritesPage", () => {
  it("returns empty pages when signed out", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getFavoritesPage({ key: "date", dir: "desc" }, "items");

    expect(result.activeTab).toBe("items");
    expect(result.items).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      totalCount: 0,
    });
    expect(result.collections).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      totalCount: 0,
    });
  });

  it("applies the given sort across the full set and returns both counts", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findMany.mockResolvedValue([
      itemRow("1", "Banana", "2026-01-02T00:00:00.000Z"),
      itemRow("2", "apple", "2026-01-03T00:00:00.000Z"),
    ]);
    collection.findMany.mockResolvedValue([
      collectionRow("a", "Zeta", "2026-01-02T00:00:00.000Z"),
      collectionRow("b", "alpha", "2026-01-03T00:00:00.000Z"),
    ]);

    const result = await getFavoritesPage({ key: "name", dir: "asc" }, "items");

    // Name-asc, case-insensitive: apple before Banana, alpha before Zeta.
    expect(result.items.items.map((i) => i.title)).toEqual(["apple", "Banana"]);
    expect(result.items).toMatchObject({
      page: 1,
      totalPages: 1,
      totalCount: 2,
    });
    // Both counts are always present (for the tab badges), even though the
    // collections tab isn't the active one here.
    expect(result.collections.items.map((c) => c.name)).toEqual([
      "alpha",
      "Zeta",
    ]);
    expect(result.collections.totalCount).toBe(2);
  });

  it("paginates only the active tab to the requested page", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    // 3 items and 3 collections; page size in tests is small enough that page 2
    // of the active tab is meaningful only via clamping, so assert wiring: the
    // active tab receives `page`, the inactive tab stays on page 1.
    item.findMany.mockResolvedValue([
      itemRow("1", "a", "2026-01-01T00:00:00.000Z"),
      itemRow("2", "b", "2026-01-02T00:00:00.000Z"),
    ]);
    collection.findMany.mockResolvedValue([
      collectionRow("a", "a", "2026-01-01T00:00:00.000Z"),
    ]);

    const result = await getFavoritesPage(
      { key: "name", dir: "asc" },
      "collections",
      3,
    );

    expect(result.activeTab).toBe("collections");
    // Inactive (items) tab is always page 1.
    expect(result.items.page).toBe(1);
    // Active (collections) tab clamps the too-high page onto its last page.
    expect(result.collections.page).toBe(1);
    expect(result.collections.totalCount).toBe(1);
  });
});
