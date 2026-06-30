import { describe, expect, it } from "vitest";

import type { DashboardItem } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/favorites";
import {
  DEFAULT_FAVORITE_SORT,
  defaultDirFor,
  sortFavoriteCollections,
  sortFavoriteItems,
} from "@/lib/favorites-sort";

// Minimal DashboardItem factory — only the fields the sort reads matter.
function item(
  partial: Pick<DashboardItem, "id" | "title" | "updatedAt"> & {
    typeName?: string;
  },
): DashboardItem {
  return {
    id: partial.id,
    title: partial.title,
    description: null,
    contentType: "TEXT",
    content: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    isFavorite: true,
    isPinned: false,
    tags: [],
    updatedAt: partial.updatedAt,
    type: { name: partial.typeName ?? "Snippet", icon: null, color: null },
  };
}

function collection(
  partial: Pick<FavoriteCollection, "id" | "name" | "updatedAt">,
): FavoriteCollection {
  return { ...partial, itemCount: 0 };
}

const items: DashboardItem[] = [
  item({ id: "1", title: "Banana", updatedAt: "2026-01-02T00:00:00.000Z", typeName: "Prompt" }),
  item({ id: "2", title: "apple", updatedAt: "2026-01-03T00:00:00.000Z", typeName: "Command" }),
  item({ id: "3", title: "Cherry", updatedAt: "2026-01-01T00:00:00.000Z", typeName: "Command" }),
];

const collections: FavoriteCollection[] = [
  collection({ id: "a", name: "Zeta", updatedAt: "2026-01-02T00:00:00.000Z" }),
  collection({ id: "b", name: "alpha", updatedAt: "2026-01-03T00:00:00.000Z" }),
];

describe("defaultDirFor", () => {
  it("defaults date to descending and others to ascending", () => {
    expect(defaultDirFor("date")).toBe("desc");
    expect(defaultDirFor("name")).toBe("asc");
    expect(defaultDirFor("type")).toBe("asc");
  });

  it("DEFAULT_FAVORITE_SORT is date-descending", () => {
    expect(DEFAULT_FAVORITE_SORT).toEqual({ key: "date", dir: "desc" });
  });
});

describe("sortFavoriteItems", () => {
  it("sorts by name case-insensitively (asc)", () => {
    const result = sortFavoriteItems(items, { key: "name", dir: "asc" });
    expect(result.map((i) => i.title)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("sorts by name descending", () => {
    const result = sortFavoriteItems(items, { key: "name", dir: "desc" });
    expect(result.map((i) => i.title)).toEqual(["Cherry", "Banana", "apple"]);
  });

  it("sorts by date (newest first when desc)", () => {
    const result = sortFavoriteItems(items, { key: "date", dir: "desc" });
    expect(result.map((i) => i.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts by type, tie-breaking by title", () => {
    const result = sortFavoriteItems(items, { key: "type", dir: "asc" });
    // Command (apple, Cherry) then Prompt (Banana); within Command, title order.
    expect(result.map((i) => i.title)).toEqual(["apple", "Cherry", "Banana"]);
  });

  it("does not mutate the input array", () => {
    const original = [...items];
    sortFavoriteItems(items, { key: "name", dir: "asc" });
    expect(items).toEqual(original);
  });
});

describe("sortFavoriteCollections", () => {
  it("sorts by name case-insensitively", () => {
    const result = sortFavoriteCollections(collections, { key: "name", dir: "asc" });
    expect(result.map((c) => c.name)).toEqual(["alpha", "Zeta"]);
  });

  it("falls back to name ordering when sorting by type", () => {
    const result = sortFavoriteCollections(collections, { key: "type", dir: "asc" });
    expect(result.map((c) => c.name)).toEqual(["alpha", "Zeta"]);
  });

  it("sorts by date", () => {
    const result = sortFavoriteCollections(collections, { key: "date", dir: "desc" });
    expect(result.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array", () => {
    const original = [...collections];
    sortFavoriteCollections(collections, { key: "date", dir: "asc" });
    expect(collections).toEqual(original);
  });
});
