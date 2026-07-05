import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton and the demo-user resolver so this is a true unit
// test — no database. We assert the where-clause is user-scoped and that rows
// are mapped into the ItemDetail shape (ISO dates, tag names, collection
// passthrough). `vi.hoisted` lets the mocks exist before the hoisted factories.
const { item, itemType, itemTag, itemCollection, collection, tag, $transaction } =
  vi.hoisted(() => {
    const item = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    };
    const itemType = { findFirst: vi.fn(), findMany: vi.fn() };
    const itemTag = { deleteMany: vi.fn(), create: vi.fn() };
    const itemCollection = { deleteMany: vi.fn(), createMany: vi.fn() };
    const collection = { findMany: vi.fn() };
    const tag = { upsert: vi.fn() };
    // Run the transaction callback against the same mocked delegates.
    const $transaction = vi.fn((cb: (tx: unknown) => unknown) =>
      cb({ item, itemTag, itemCollection, collection, tag }),
    );
    return {
      item,
      itemType,
      itemTag,
      itemCollection,
      collection,
      tag,
      $transaction,
    };
  });
const { getSessionUser } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));
const { deleteFromR2, keyFromPublicUrl } = vi.hoisted(() => ({
  deleteFromR2: vi.fn(),
  // Mirror the real helper: strip a known public-bucket prefix, else null.
  keyFromPublicUrl: vi.fn((url: string) => {
    const prefix = "https://pub-test.r2.dev/";
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { item, itemType, itemTag, itemCollection, collection, tag, $transaction },
}));
vi.mock("@/lib/db/user", () => ({
  getSessionUser,
}));
vi.mock("@/lib/r2", () => ({
  deleteFromR2,
  keyFromPublicUrl,
}));

import {
  createItem,
  deleteItem,
  getAllItems,
  getItemDetail,
  getItemsByTypeSlug,
  linkCollections,
  linkTags,
  setItemFavorite,
  setItemPinned,
  sortByTypeOrder,
  updateItem,
} from "@/lib/db/items";
import { ITEMS_PER_PAGE } from "@/lib/pagination";
import { FREE_LIMITS, PlanLimitError } from "@/lib/billing/plan";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sortByTypeOrder", () => {
  it("orders types by SYSTEM_TYPE_ORDER, tie-breaking unknowns alphabetically", () => {
    const input = [
      { name: "Url" },
      { name: "Zebra" }, // unlisted → end
      { name: "Snippet" },
      { name: "Alpha" }, // unlisted → end (before Zebra alphabetically)
      { name: "Note" },
    ];

    const sorted = sortByTypeOrder(input).map((t) => t.name);

    expect(sorted).toEqual(["Snippet", "Note", "Url", "Alpha", "Zebra"]);
  });

  it("returns a new array without mutating the input", () => {
    const input = [{ name: "Note" }, { name: "Snippet" }];
    const sorted = sortByTypeOrder(input);

    expect(sorted).not.toBe(input);
    expect(input.map((t) => t.name)).toEqual(["Note", "Snippet"]);
  });
});

describe("getItemsByTypeSlug", () => {
  const types = [
    { id: "t_snip", name: "snippet", icon: "Code", color: "#blue" },
    { id: "t_url", name: "URL", icon: "Link", color: "#green" },
  ];

  it("returns null for a slug that matches no system type (no item query)", async () => {
    itemType.findMany.mockResolvedValue(types);

    const result = await getItemsByTypeSlug("widgets");

    expect(result).toBeNull();
    expect(item.count).not.toHaveBeenCalled();
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("resolves the plural slug and returns an empty page when there is no user", async () => {
    itemType.findMany.mockResolvedValue(types);
    getSessionUser.mockResolvedValue(null);

    const result = await getItemsByTypeSlug("snippets");

    expect(result).toEqual({
      type: types[0],
      items: [],
      page: 1,
      totalPages: 1,
      totalCount: 0,
    });
    expect(item.count).not.toHaveBeenCalled();
  });

  it("fetches only the requested page (count + skip/take), scoped to user + type", async () => {
    itemType.findMany.mockResolvedValue(types);
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.count.mockResolvedValue(1);
    item.findMany.mockResolvedValue([]);

    const result = await getItemsByTypeSlug("urls");

    expect(item.count).toHaveBeenCalledWith({
      where: { userId: "user_1", typeId: "t_url" },
    });
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1", typeId: "t_url" },
        // Pinned items sort to the top, then most recent first.
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        skip: 0,
        take: ITEMS_PER_PAGE,
      }),
    );
    expect(result).toMatchObject({
      type: types[1],
      page: 1,
      totalPages: 1,
      totalCount: 1,
    });
  });

  it("clamps a too-high page to the last page", async () => {
    itemType.findMany.mockResolvedValue(types);
    getSessionUser.mockResolvedValue({ id: "user_1" });
    // 22 items → 2 pages of 21. Page 7 should clamp to page 2 (skip = 21).
    item.count.mockResolvedValue(ITEMS_PER_PAGE + 1);
    item.findMany.mockResolvedValue([]);

    const result = await getItemsByTypeSlug("snippets", 7);

    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: ITEMS_PER_PAGE, take: ITEMS_PER_PAGE }),
    );
    expect(result).toMatchObject({ page: 2, totalPages: 2, totalCount: 22 });
  });
});

describe("linkTags", () => {
  // The mocked tag/itemTag delegates stand in for the transaction client.
  const tx = { tag, itemTag } as never;

  it("does nothing for an empty tag list", async () => {
    await linkTags(tx, "user_1", "item_1", []);

    expect(tag.upsert).not.toHaveBeenCalled();
    expect(itemTag.create).not.toHaveBeenCalled();
  });

  it("connect-or-creates each tag scoped to the user, then links it", async () => {
    tag.upsert
      .mockResolvedValueOnce({ id: "tag_react" })
      .mockResolvedValueOnce({ id: "tag_hooks" });

    await linkTags(tx, "user_1", "item_1", ["react", "hooks"]);

    expect(tag.upsert).toHaveBeenCalledTimes(2);
    expect(tag.upsert.mock.calls[0][0]).toEqual({
      where: { userId_name: { userId: "user_1", name: "react" } },
      create: { name: "react", userId: "user_1" },
      update: {},
    });
    expect(itemTag.create).toHaveBeenNthCalledWith(1, {
      data: { itemId: "item_1", tagId: "tag_react" },
    });
    expect(itemTag.create).toHaveBeenNthCalledWith(2, {
      data: { itemId: "item_1", tagId: "tag_hooks" },
    });
  });
});

describe("linkCollections", () => {
  const tx = { collection, itemCollection } as never;

  it("does nothing for an empty id list (no ownership query, no write)", async () => {
    await linkCollections(tx, "user_1", "item_1", []);

    expect(collection.findMany).not.toHaveBeenCalled();
    expect(itemCollection.createMany).not.toHaveBeenCalled();
  });

  it("links only the collections the user owns", async () => {
    // user owns col_a; col_x is foreign and silently dropped.
    collection.findMany.mockResolvedValue([{ id: "col_a" }]);

    await linkCollections(tx, "user_1", "item_1", ["col_a", "col_x"]);

    expect(collection.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["col_a", "col_x"] }, userId: "user_1" },
      select: { id: true },
    });
    expect(itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item_1", collectionId: "col_a" }],
    });
  });

  it("writes nothing when none of the ids belong to the user", async () => {
    collection.findMany.mockResolvedValue([]);

    await linkCollections(tx, "user_1", "item_1", ["col_x"]);

    expect(itemCollection.createMany).not.toHaveBeenCalled();
  });
});

describe("getAllItems", () => {
  it("returns an empty array without querying when there is no user", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getAllItems();

    expect(result).toEqual([]);
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("scopes to the user, orders by updatedAt desc, and maps to DashboardItem", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findMany.mockResolvedValue([
      {
        id: "item_1",
        title: "useDebounce hook",
        description: "Debounce a value.",
        contentType: "TEXT",
        content: "export function useDebounce() {}",
        fileUrl: null,
        fileName: null,
        fileSize: null,
        url: null,
        isFavorite: false,
        isPinned: false,
        updatedAt: new Date("2026-01-02T03:04:05.000Z"),
        type: { name: "snippet", icon: "Code", color: "#abc" },
        tags: [{ tag: { name: "react" } }],
      },
    ]);

    const result = await getAllItems();

    const arg = item.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: "user_1" });
    expect(arg.orderBy).toEqual({ updatedAt: "desc" });
    expect(result).toEqual([
      {
        id: "item_1",
        title: "useDebounce hook",
        description: "Debounce a value.",
        contentType: "TEXT",
        content: "export function useDebounce() {}",
        fileUrl: null,
        fileName: null,
        fileSize: null,
        url: null,
        isFavorite: false,
        isPinned: false,
        tags: ["react"],
        updatedAt: "2026-01-02T03:04:05.000Z",
        type: { name: "snippet", icon: "Code", color: "#abc" },
      },
    ]);
  });
});

describe("getItemDetail", () => {
  it("returns null when there is no demo user (no query)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await getItemDetail("item_1");

    expect(result).toBeNull();
    expect(item.findFirst).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the demo user and the given id", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue(null);

    const result = await getItemDetail("item_1");

    expect(result).toBeNull();
    const arg = item.findFirst.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "item_1", userId: "user_1" });
  });

  it("maps a row into the ItemDetail shape (ISO dates, tags, collections)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
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
      collections: [
        { collection: { id: "col_1", name: "React Patterns" } },
        { collection: { id: "col_2", name: "Hooks" } },
      ],
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
      collections: [
        { id: "col_1", name: "React Patterns" },
        { id: "col_2", name: "Hooks" },
      ],
    });
  });

  it("maps an item with no collections to an empty array", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
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
      collections: [],
      tags: [],
    });

    const result = await getItemDetail("item_2");

    expect(result?.collections).toEqual([]);
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
    collectionIds: ["col_a"],
  };

  it("returns null when there is no demo user (no writes)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await updateItem("item_1", data);

    expect(result).toBeNull();
    expect(item.findFirst).not.toHaveBeenCalled();
    expect($transaction).not.toHaveBeenCalled();
  });

  it("returns null without writing when the item isn't the demo user's", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
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
    getSessionUser.mockResolvedValue({ id: "user_1" });
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
        collections: [{ collection: { id: "col_a", name: "A" } }],
        tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
      });
    tag.upsert
      .mockResolvedValueOnce({ id: "tag_react" })
      .mockResolvedValueOnce({ id: "tag_hooks" });
    collection.findMany.mockResolvedValue([{ id: "col_a" }]);

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
    // Collection membership replaced: old links cleared, owned set re-linked.
    expect(itemCollection.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "item_1" },
    });
    expect(itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item_1", collectionId: "col_a" }],
    });
    // Returns the freshly re-read ItemDetail.
    expect(result?.title).toBe("New title");
    expect(result?.tags).toEqual(["react", "hooks"]);
    expect(result?.collections).toEqual([{ id: "col_a", name: "A" }]);
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
    collectionIds: [],
  };

  it("returns null when there is no demo user (no writes)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await createItem(data);

    expect(result).toBeNull();
    expect(itemType.findFirst).not.toHaveBeenCalled();
    expect($transaction).not.toHaveBeenCalled();
  });

  it("returns null when the type doesn't resolve (no writes)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
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
    getSessionUser.mockResolvedValue({ id: "user_1" });
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
      collections: [],
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
        fileUrl: null,
        fileName: null,
        fileSize: null,
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

  it("links the chosen collections (ownership-checked) on create", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    itemType.findFirst.mockResolvedValue({ id: "type_snippet" });
    item.create.mockResolvedValue({ id: "item_new" });
    tag.upsert.mockResolvedValueOnce({ id: "tag_react" });
    collection.findMany.mockResolvedValue([{ id: "col_a" }]);
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
      collections: [{ collection: { id: "col_a", name: "A" } }],
      tags: [{ tag: { name: "react" } }],
    });

    const result = await createItem({ ...data, collectionIds: ["col_a", "col_x"] });

    expect(collection.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["col_a", "col_x"] }, userId: "user_1" },
      select: { id: true },
    });
    expect(itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item_new", collectionId: "col_a" }],
    });
    expect(result?.collections).toEqual([{ id: "col_a", name: "A" }]);
  });

  it("creates a FILE item with the R2 metadata (no text fields)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: true });
    itemType.findFirst.mockResolvedValue({ id: "type_image" });
    item.create.mockResolvedValue({ id: "item_img" });
    item.findFirst.mockResolvedValue({
      id: "item_img",
      title: "Logo",
      description: null,
      contentType: "FILE",
      content: null,
      fileUrl: "https://pub-test.r2.dev/uploads/user_1/image/abc.png",
      fileName: "logo.png",
      fileSize: 2048,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: null,
      type: { name: "image", icon: "Image", color: null },
      collections: [],
      tags: [],
    });

    const result = await createItem({
      type: "image",
      title: "Logo",
      description: null,
      content: "ignored",
      url: "ignored",
      language: "ignored",
      fileUrl: "https://pub-test.r2.dev/uploads/user_1/image/abc.png",
      fileName: "logo.png",
      fileSize: 2048,
      tags: [],
      collectionIds: [],
    });

    // Text fields are nulled; file metadata + FILE content type are stored.
    expect(item.create).toHaveBeenCalledWith({
      data: {
        title: "Logo",
        description: null,
        content: null,
        url: null,
        language: null,
        fileUrl: "https://pub-test.r2.dev/uploads/user_1/image/abc.png",
        fileName: "logo.png",
        fileSize: 2048,
        contentType: "FILE",
        userId: "user_1",
        typeId: "type_image",
      },
      select: { id: true },
    });
    expect(result?.contentType).toBe("FILE");
    expect(result?.fileName).toBe("logo.png");
  });

  it("returns null (no write) when a file item's fileUrl isn't in our R2 bucket", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: true });
    itemType.findFirst.mockResolvedValue({ id: "type_image" });

    const result = await createItem({
      type: "image",
      title: "Forged",
      description: null,
      content: null,
      url: null,
      language: null,
      // Attacker-controlled URL outside our bucket → keyFromPublicUrl returns null.
      fileUrl: "https://evil.example.com/tracker.png",
      fileName: "tracker.png",
      fileSize: 2048,
      tags: [],
      collectionIds: [],
    });

    expect(result).toBeNull();
    expect(keyFromPublicUrl).toHaveBeenCalledWith(
      "https://evil.example.com/tracker.png",
    );
    expect(item.create).not.toHaveBeenCalled();
    expect($transaction).not.toHaveBeenCalled();
  });
});

describe("createItem plan gating", () => {
  const data = {
    type: "snippet",
    title: "New snippet",
    description: null,
    content: "x",
    url: null,
    language: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    tags: [],
    collectionIds: [],
  };

  it("throws PlanLimitError('item') when a Free user is at the item cap", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: false });
    itemType.findFirst.mockResolvedValue({ id: "type_snippet" });
    item.count.mockResolvedValue(FREE_LIMITS.items);

    await expect(createItem(data)).rejects.toBeInstanceOf(PlanLimitError);
    // Gated before any write.
    expect($transaction).not.toHaveBeenCalled();
    expect(item.count).toHaveBeenCalledWith({ where: { userId: "user_1" } });
  });

  it("does not gate a Pro user at (or over) the item cap", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: true });
    itemType.findFirst.mockResolvedValue({ id: "type_snippet" });
    item.count.mockResolvedValue(FREE_LIMITS.items + 5);
    item.create.mockResolvedValue({ id: "item_new" });
    item.findFirst.mockResolvedValue({
      id: "item_new",
      title: "New snippet",
      description: null,
      contentType: "TEXT",
      content: "x",
      fileName: null,
      fileSize: null,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: null,
      type: { name: "snippet", icon: "Code", color: null },
      collections: [],
      tags: [],
    });

    const result = await createItem(data);

    expect(result?.id).toBe("item_new");
    expect($transaction).toHaveBeenCalled();
  });

  it("lets a Free user under the cap create an item", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: false });
    itemType.findFirst.mockResolvedValue({ id: "type_snippet" });
    item.count.mockResolvedValue(FREE_LIMITS.items - 1);
    item.create.mockResolvedValue({ id: "item_new" });
    item.findFirst.mockResolvedValue({
      id: "item_new",
      title: "New snippet",
      description: null,
      contentType: "TEXT",
      content: "x",
      fileName: null,
      fileSize: null,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: null,
      type: { name: "snippet", icon: "Code", color: null },
      collections: [],
      tags: [],
    });

    const result = await createItem(data);

    expect(result?.id).toBe("item_new");
  });

  it("throws PlanLimitError('file') when a Free user creates a File item", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: false });
    itemType.findFirst.mockResolvedValue({ id: "type_file" });
    item.count.mockResolvedValue(0);

    await expect(
      createItem({
        ...data,
        type: "file",
        fileUrl: "https://pub-test.r2.dev/uploads/user_1/file/doc.pdf",
        fileName: "doc.pdf",
        fileSize: 1024,
      }),
    ).rejects.toBeInstanceOf(PlanLimitError);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("lets a Pro user create a File item", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: true });
    itemType.findFirst.mockResolvedValue({ id: "type_file" });
    item.count.mockResolvedValue(0);
    item.create.mockResolvedValue({ id: "item_file" });
    item.findFirst.mockResolvedValue({
      id: "item_file",
      title: "Doc",
      description: null,
      contentType: "FILE",
      content: null,
      fileName: "doc.pdf",
      fileSize: 1024,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: null,
      type: { name: "file", icon: "File", color: null },
      collections: [],
      tags: [],
    });

    const result = await createItem({
      ...data,
      type: "file",
      fileUrl: "https://pub-test.r2.dev/uploads/user_1/file/doc.pdf",
      fileName: "doc.pdf",
      fileSize: 1024,
    });

    expect(result?.id).toBe("item_file");
    expect($transaction).toHaveBeenCalled();
  });

  it("throws PlanLimitError('image') when a Free user creates an Image item", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: false });
    itemType.findFirst.mockResolvedValue({ id: "type_image" });
    item.count.mockResolvedValue(0);

    await expect(
      createItem({
        ...data,
        type: "image",
        fileUrl: "https://pub-test.r2.dev/uploads/user_1/image/logo.png",
        fileName: "logo.png",
        fileSize: 2048,
      }),
    ).rejects.toBeInstanceOf(PlanLimitError);
    expect(item.create).not.toHaveBeenCalled();
  });

  it("lets a Pro user create an Image item", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1", isPro: true });
    itemType.findFirst.mockResolvedValue({ id: "type_image" });
    item.count.mockResolvedValue(0);
    item.create.mockResolvedValue({ id: "item_img" });
    item.findFirst.mockResolvedValue({
      id: "item_img",
      title: "Logo",
      description: null,
      contentType: "FILE",
      content: null,
      fileName: "logo.png",
      fileSize: 2048,
      url: null,
      isFavorite: false,
      isPinned: false,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      language: null,
      type: { name: "image", icon: "Image", color: null },
      collections: [],
      tags: [],
    });

    const result = await createItem({
      ...data,
      type: "image",
      fileUrl: "https://pub-test.r2.dev/uploads/user_1/image/logo.png",
      fileName: "logo.png",
      fileSize: 2048,
    });

    expect(result?.id).toBe("item_img");
  });
});

describe("deleteItem", () => {
  it("returns false when there is no demo user (no delete)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await deleteItem("item_1");

    expect(result).toBe(false);
    expect(item.deleteMany).not.toHaveBeenCalled();
  });

  it("scopes the delete to the demo user and returns true when a row is removed", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue({ fileUrl: null });
    item.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteItem("item_1");

    expect(result).toBe(true);
    expect(item.deleteMany).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1" },
    });
    // No backing file → no R2 cleanup.
    expect(deleteFromR2).not.toHaveBeenCalled();
  });

  it("deletes the backing R2 object for a file item after the row is gone", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue({
      fileUrl: "https://pub-test.r2.dev/uploads/user_1/file/doc.pdf",
    });
    item.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteItem("item_file");

    expect(result).toBe(true);
    expect(keyFromPublicUrl).toHaveBeenCalledWith(
      "https://pub-test.r2.dev/uploads/user_1/file/doc.pdf",
    );
    expect(deleteFromR2).toHaveBeenCalledWith("uploads/user_1/file/doc.pdf");
  });

  it("does not touch R2 when the row didn't match", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.findFirst.mockResolvedValue({
      fileUrl: "https://pub-test.r2.dev/uploads/user_1/file/doc.pdf",
    });
    item.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteItem("item_x");

    expect(result).toBe(false);
    expect(deleteFromR2).not.toHaveBeenCalled();
  });

  it("returns false when no row matched (unknown or foreign id)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteItem("item_x");

    expect(result).toBe(false);
  });
});

describe("setItemFavorite", () => {
  it("returns false when there is no user (no write)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await setItemFavorite("item_1", true);

    expect(result).toBe(false);
    expect(item.updateMany).not.toHaveBeenCalled();
  });

  it("updates scoped to the user and returns true when a row changed", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.updateMany.mockResolvedValue({ count: 1 });

    const result = await setItemFavorite("item_1", true);

    expect(item.updateMany).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1" },
      data: { isFavorite: true },
    });
    expect(result).toBe(true);
  });

  it("passes the desired state through (unfavorite)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.updateMany.mockResolvedValue({ count: 1 });

    await setItemFavorite("item_1", false);

    expect(item.updateMany.mock.calls[0][0].data).toEqual({ isFavorite: false });
  });

  it("returns false when no row matched (not owned / missing)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.updateMany.mockResolvedValue({ count: 0 });

    const result = await setItemFavorite("item_x", true);

    expect(result).toBe(false);
  });
});

describe("setItemPinned", () => {
  it("returns false when there is no user (no write)", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await setItemPinned("item_1", true);

    expect(result).toBe(false);
    expect(item.updateMany).not.toHaveBeenCalled();
  });

  it("updates scoped to the user and returns true when a row changed", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.updateMany.mockResolvedValue({ count: 1 });

    const result = await setItemPinned("item_1", true);

    expect(item.updateMany).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1" },
      data: { isPinned: true },
    });
    expect(result).toBe(true);
  });

  it("passes the desired state through (unpin)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.updateMany.mockResolvedValue({ count: 1 });

    await setItemPinned("item_1", false);

    expect(item.updateMany.mock.calls[0][0].data).toEqual({ isPinned: false });
  });

  it("returns false when no row matched (not owned / missing)", async () => {
    getSessionUser.mockResolvedValue({ id: "user_1" });
    item.updateMany.mockResolvedValue({ count: 0 });

    const result = await setItemPinned("item_x", true);

    expect(result).toBe(false);
  });
});
