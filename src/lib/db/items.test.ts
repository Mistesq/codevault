import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton and the demo-user resolver so this is a true unit
// test — no database. We assert the where-clause is user-scoped and that rows
// are mapped into the ItemDetail shape (ISO dates, tag names, collection
// passthrough). `vi.hoisted` lets the mocks exist before the hoisted factories.
const { item } = vi.hoisted(() => ({
  item: { findFirst: vi.fn() },
}));
const { getDemoUser } = vi.hoisted(() => ({
  getDemoUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { item },
}));
vi.mock("@/lib/db/user", () => ({
  getDemoUser,
}));

import { getItemDetail } from "@/lib/db/items";

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
