import { beforeEach, describe, expect, it, vi } from "vitest";

// getSearchData composes the two existing list queries, so we mock both and
// assert the aggregation/trimming — not the underlying DB access (covered by
// the items/collections tests). `vi.hoisted` lets the mocks predate the factory.
const { getAllItems, getAllCollections } = vi.hoisted(() => ({
  getAllItems: vi.fn(),
  getAllCollections: vi.fn(),
}));

vi.mock("@/lib/db/items", () => ({ getAllItems }));
vi.mock("@/lib/db/collections", () => ({ getAllCollections }));

import { getSearchData } from "@/lib/db/search";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSearchData", () => {
  it("passes items through and trims collections to id/name/itemCount", async () => {
    const items = [{ id: "item_1", title: "useDebounce hook" }];
    getAllItems.mockResolvedValue(items);
    getAllCollections.mockResolvedValue([
      {
        id: "col_1",
        name: "React Patterns",
        description: "Reusable patterns",
        isFavorite: true,
        itemCount: 3,
        borderColor: "#abc",
        types: [{ id: "t1", name: "snippet", icon: "Code", color: "#abc" }],
      },
    ]);

    const result = await getSearchData();

    expect(result.items).toBe(items);
    expect(result.collections).toEqual([
      { id: "col_1", name: "React Patterns", itemCount: 3 },
    ]);
  });

  it("returns empty arrays when the user has no items or collections", async () => {
    getAllItems.mockResolvedValue([]);
    getAllCollections.mockResolvedValue([]);

    const result = await getSearchData();

    expect(result).toEqual({ items: [], collections: [] });
  });
});
