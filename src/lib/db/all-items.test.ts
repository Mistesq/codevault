import { beforeEach, describe, expect, it, vi } from "vitest";

// True unit test for getAllItemsPaginated: mock the Prisma singleton and the
// session-user resolver so no database is touched. We assert the empty page when
// signed out, the user-scoped where + pinned-first/most-recent ordering + the
// page slice (skip/take), clamping of a too-high page, and row mapping into the
// DashboardItem shape. `vi.hoisted` lets the mocks exist before the factory runs.
const { item } = vi.hoisted(() => ({
  item: { count: vi.fn(), findMany: vi.fn() },
}));
const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: { item } }));
vi.mock("@/lib/db/user", () => ({ getSessionUser }));

import { getAllItemsPaginated } from "@/lib/db/items";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAllItemsPaginated", () => {
  it("returns an empty page and skips queries when signed out", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getAllItemsPaginated();

    expect(result).toEqual({ items: [], page: 1, totalPages: 1, totalCount: 0 });
    expect(item.count).not.toHaveBeenCalled();
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("scopes the query to the user, pinned-first then most recent, for the requested page", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    // Two full pages + one item.
    item.count.mockResolvedValue(ITEMS_PER_PAGE * 2 + 1);
    item.findMany.mockResolvedValue([]);

    const result = await getAllItemsPaginated(2);

    expect(item.count).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        skip: ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
    );
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.totalCount).toBe(ITEMS_PER_PAGE * 2 + 1);
  });

  it("clamps a too-high page to the last page", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.count.mockResolvedValue(5); // one page
    item.findMany.mockResolvedValue([]);

    const result = await getAllItemsPaginated(99);

    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: ITEMS_PER_PAGE }),
    );
  });

  it("maps rows into the DashboardItem shape (ISO date, flattened tags)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.count.mockResolvedValue(1);
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
        isFavorite: false,
        isPinned: true,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        type: { name: "snippet", icon: "Code", color: "#abc" },
        tags: [{ tag: { name: "react" } }],
      },
    ]);

    const result = await getAllItemsPaginated();

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
        isFavorite: false,
        isPinned: true,
        tags: ["react"],
        updatedAt: "2026-01-01T00:00:00.000Z",
        type: { name: "snippet", icon: "Code", color: "#abc" },
      },
    ]);
  });
});
