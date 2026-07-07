import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton so this is a true unit test — no database. The
// $transaction mock invokes the callback with a tx client whose methods we can
// assert on. `vi.hoisted` lets the mocks exist before the hoisted factories.
const { item, collection, itemType, tx, $transaction } = vi.hoisted(() => {
  const tx = {
    collection: { create: vi.fn() },
    item: { create: vi.fn() },
    itemCollection: { create: vi.fn() },
    tag: { upsert: vi.fn() },
    itemTag: { create: vi.fn() },
  };
  return {
    tx,
    item: { count: vi.fn() },
    collection: { count: vi.fn() },
    itemType: { findMany: vi.fn() },
    $transaction: vi.fn(
      async (fn: (client: typeof tx) => Promise<void>) => fn(tx),
    ),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: { item, collection, itemType, $transaction },
}));
// onboarding.ts pulls linkTags from db/items, whose module graph reaches
// next-auth via getSessionUser — stub the session module out of the way.
vi.mock("@/lib/db/user", () => ({
  getSessionUser: vi.fn(),
}));

import { seedNewUserData } from "@/lib/db/onboarding";
import {
  STARTER_COLLECTIONS,
  type StarterItem,
} from "@/lib/onboarding-content";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

const SYSTEM_TYPE_NAMES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "URL",
];

const starterItems: StarterItem[] = STARTER_COLLECTIONS.flatMap(
  (c) => c.items,
);

function mockSystemTypes(names: string[] = SYSTEM_TYPE_NAMES) {
  itemType.findMany.mockResolvedValue(
    names.map((name) => ({ id: `type_${name}`, name })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  item.count.mockResolvedValue(0);
  collection.count.mockResolvedValue(0);
  mockSystemTypes();
  let n = 0;
  tx.collection.create.mockImplementation(async () => ({ id: `col_${++n}` }));
  tx.item.create.mockImplementation(async () => ({ id: `item_${++n}` }));
  tx.tag.upsert.mockImplementation(async () => ({ id: `tag_${++n}` }));
});

describe("seedNewUserData", () => {
  it("creates every starter collection and item scoped to the user", async () => {
    await seedNewUserData("user_1");

    expect(tx.collection.create).toHaveBeenCalledTimes(
      STARTER_COLLECTIONS.length,
    );
    expect(tx.item.create).toHaveBeenCalledTimes(starterItems.length);
    expect(tx.itemCollection.create).toHaveBeenCalledTimes(starterItems.length);

    // Every item is linked to the collection it was declared in: the first
    // collection's items point at col_1, the second's at the next created id.
    const firstCollectionSize = STARTER_COLLECTIONS[0].items.length;
    const linkCalls = tx.itemCollection.create.mock.calls;
    const firstColId = linkCalls[0][0].data.collectionId;
    const secondColId = linkCalls[firstCollectionSize][0].data.collectionId;
    expect(firstColId).not.toBe(secondColId);
    linkCalls.forEach((call, i) => {
      expect(call[0].data.collectionId).toBe(
        i < firstCollectionSize ? firstColId : secondColId,
      );
    });

    for (const call of tx.collection.create.mock.calls) {
      expect(call[0].data.userId).toBe("user_1");
    }
    for (const call of tx.item.create.mock.calls) {
      expect(call[0].data.userId).toBe("user_1");
      expect(call[0].data.typeId).toMatch(/^type_/);
    }
  });

  it("upserts tags per user and links them to items", async () => {
    await seedNewUserData("user_1");

    const declaredTags = starterItems.reduce(
      (sum, i) => sum + (i.tags?.length ?? 0),
      0,
    );
    expect(tx.tag.upsert).toHaveBeenCalledTimes(declaredTags);
    expect(tx.itemTag.create).toHaveBeenCalledTimes(declaredTags);
    expect(tx.tag.upsert.mock.calls[0][0].where.userId_name.userId).toBe(
      "user_1",
    );
  });

  it("skips when the user already owns items", async () => {
    item.count.mockResolvedValue(3);

    await seedNewUserData("user_1");

    expect($transaction).not.toHaveBeenCalled();
  });

  it("skips when the user already owns collections", async () => {
    collection.count.mockResolvedValue(1);

    await seedNewUserData("user_1");

    expect($transaction).not.toHaveBeenCalled();
  });

  it("skips items whose system type is missing instead of aborting", async () => {
    mockSystemTypes(["note"]);

    await seedNewUserData("user_1");

    const noteItems = starterItems.filter((i) => i.type === "note");
    expect(tx.item.create).toHaveBeenCalledTimes(noteItems.length);
    // Collections are still created so the resolvable items have a home.
    expect(tx.collection.create).toHaveBeenCalledTimes(
      STARTER_COLLECTIONS.length,
    );
  });

  it("never throws when seeding fails (registration must not break)", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    $transaction.mockRejectedValueOnce(new Error("db down"));

    await expect(seedNewUserData("user_1")).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("starter content", () => {
  it("only uses text-based system types (File/Image need R2 + Pro)", () => {
    const allowed = new Set(["snippet", "prompt", "command", "note", "URL"]);
    for (const item of starterItems) {
      expect(allowed).toContain(item.type);
    }
  });

  it("stays under the Free-tier caps (50 items / 3 collections)", () => {
    expect(STARTER_COLLECTIONS.length).toBeLessThan(3);
    expect(starterItems.length).toBeLessThan(50);
  });

  it("URL items carry a url, text items carry content", () => {
    for (const item of starterItems) {
      if (item.type === "URL") {
        expect(item.url).toMatch(/^https:\/\//);
      } else {
        expect(item.content?.trim()).toBeTruthy();
      }
    }
  });

  it("has something pinned and something favorited for the dashboard", () => {
    expect(starterItems.some((i) => i.isPinned)).toBe(true);
    expect(starterItems.some((i) => i.isFavorite)).toBe(true);
  });

  it("only uses languages from the curated LANGUAGE_OPTIONS list", () => {
    const known = new Set(LANGUAGE_OPTIONS.map((o) => o.value));
    for (const item of starterItems) {
      if (item.language) {
        expect(known).toContain(item.language);
      }
    }
  });

  it("has unique collection names (per-user unique constraint)", () => {
    const names = STARTER_COLLECTIONS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
