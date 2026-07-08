import { describe, expect, it, vi } from "vitest";

import { insertDemoContent } from "@/lib/demo/insert-demo-content";
import {
  DEMO_SEED_COLLECTIONS,
  DEMO_SEED_STANDALONE_ITEMS,
  allDemoSeedItems,
} from "@/lib/demo/seed-data";
import type { Prisma } from "@/generated/prisma/client";

// Seed-reset equivalence guard: prisma/seed.ts and the reset routine both call
// insertDemoContent, so proving this function writes exactly the canonical
// constants proves the "fresh deploy" and "just reset" states cannot drift.

const SYSTEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "URL",
].map((name) => ({ id: `type_${name}`, name }));

interface CreatedItem {
  title: string;
  description: string;
  isFavorite: boolean;
  isPinned: boolean;
  typeId: string;
  userId: string;
}

function buildDbMock() {
  const created = {
    items: [] as CreatedItem[],
    tags: [] as string[],
    collections: [] as { name: string; isFavorite: boolean }[],
    itemTags: [] as { itemId: string; tagId: string }[],
    itemCollections: [] as { itemId: string; collectionId: string }[],
  };

  const itemTypeFindMany = vi.fn().mockResolvedValue(SYSTEM_TYPES);
  const db = {
    itemType: { findMany: itemTypeFindMany },
    tag: {
      createManyAndReturn: vi.fn(
        async ({ data }: { data: { name: string }[] }) => {
          created.tags.push(...data.map((t) => t.name));
          return data.map((t) => ({ id: `tag_${t.name}`, name: t.name }));
        },
      ),
    },
    collection: {
      createManyAndReturn: vi.fn(
        async ({ data }: { data: { name: string; isFavorite: boolean }[] }) => {
          created.collections.push(...data);
          return data.map((c) => ({ id: `col_${c.name}`, name: c.name }));
        },
      ),
    },
    item: {
      createManyAndReturn: vi.fn(async ({ data }: { data: CreatedItem[] }) => {
        created.items.push(...data);
        return data.map((i) => ({ id: `item_${i.title}`, title: i.title }));
      }),
    },
    itemTag: {
      createMany: vi.fn(
        async ({ data }: { data: { itemId: string; tagId: string }[] }) => {
          created.itemTags.push(...data);
        },
      ),
    },
    itemCollection: {
      createMany: vi.fn(
        async ({
          data,
        }: {
          data: { itemId: string; collectionId: string }[];
        }) => {
          created.itemCollections.push(...data);
        },
      ),
    },
  };

  return {
    db: db as unknown as Prisma.TransactionClient,
    itemTypeFindMany,
    created,
  };
}

describe("insertDemoContent", () => {
  it("creates exactly the canonical items — no more, no fewer", async () => {
    const { db, created } = buildDbMock();

    await insertDemoContent(db, "demo_1");

    const expected = allDemoSeedItems();
    expect(created.items.map((i) => i.title).sort()).toEqual(
      expected.map((i) => i.title).sort(),
    );
    for (const item of created.items) {
      const source = expected.find((i) => i.title === item.title)!;
      expect(item.description).toBe(source.description);
      expect(item.isFavorite).toBe(source.isFavorite ?? false);
      expect(item.isPinned).toBe(source.isPinned ?? false);
      expect(item.typeId).toBe(`type_${source.typeName}`);
      expect(item.userId).toBe("demo_1");
    }
  });

  it("links every item to exactly its canonical tags", async () => {
    const { db, created } = buildDbMock();

    await insertDemoContent(db, "demo_1");

    const expectedPairs = allDemoSeedItems()
      .flatMap((item) =>
        item.tags.map((tag) => `item_${item.title}::tag_${tag}`),
      )
      .sort();
    const actualPairs = created.itemTags
      .map((row) => `${row.itemId}::${row.tagId}`)
      .sort();
    expect(actualPairs).toEqual(expectedPairs);
  });

  it("creates every canonical collection and links its items; standalone items stay unlinked", async () => {
    const { db, created } = buildDbMock();

    await insertDemoContent(db, "demo_1");

    expect(created.collections.map((c) => c.name).sort()).toEqual(
      DEMO_SEED_COLLECTIONS.map((c) => c.name).sort(),
    );

    const expectedMembership = DEMO_SEED_COLLECTIONS.flatMap((collection) =>
      collection.items.map(
        (item) => `item_${item.title}::col_${collection.name}`,
      ),
    ).sort();
    const actualMembership = created.itemCollections
      .map((row) => `${row.itemId}::${row.collectionId}`)
      .sort();
    expect(actualMembership).toEqual(expectedMembership);

    const linkedItemIds = new Set(created.itemCollections.map((r) => r.itemId));
    for (const item of DEMO_SEED_STANDALONE_ITEMS) {
      expect(linkedItemIds.has(`item_${item.title}`)).toBe(false);
    }
  });

  it("creates each unique tag once, scoped to the user", async () => {
    const { db, created } = buildDbMock();

    await insertDemoContent(db, "demo_1");

    const expected = [...new Set(allDemoSeedItems().flatMap((i) => i.tags))];
    expect(created.tags.sort()).toEqual([...expected].sort());
  });

  it("throws before any write when a referenced system type is missing", async () => {
    const { db, itemTypeFindMany, created } = buildDbMock();
    itemTypeFindMany.mockResolvedValue([]);

    await expect(insertDemoContent(db, "demo_1")).rejects.toThrow(
      /unknown system item type/,
    );
    expect(created.tags).toHaveLength(0);
    expect(created.items).toHaveLength(0);
  });
});
