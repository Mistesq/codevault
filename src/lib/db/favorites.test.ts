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

import { getFavorites } from "@/lib/db/favorites";

beforeEach(() => {
  vi.clearAllMocks();
});

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
