import type { Prisma } from "@/generated/prisma/client";
import { DEMO_SEED_COLLECTIONS, allDemoSeedItems } from "./seed-data";

// Deliberately NOT server-only: prisma/seed.ts runs outside Next.js via tsx —
// hence the relative (non-alias) runtime import above. The `@/generated` import
// is type-only, so it is erased at compile time and never resolved by tsx.

/**
 * Insert the canonical demo content for `userId`: tags, collections, items, and
 * their join rows. Assumes the user currently owns no content (fresh seed or
 * just-wiped workspace) and that the system item types already exist.
 *
 * Everything is written with batched `createMany*` calls — a handful of queries
 * regardless of item count — because this runs inside the login-time reset
 * transaction, which has a tight latency budget.
 */
export async function insertDemoContent(
  db: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  const items = allDemoSeedItems();

  // Resolve system item types by name; a missing type is a programming/seed
  // error, so fail loudly (before any write) instead of silently skipping.
  const systemTypes = await db.itemType.findMany({
    where: { isSystem: true },
    select: { id: true, name: true },
  });
  const typeIdByName = new Map(systemTypes.map((t) => [t.name, t.id]));
  for (const item of items) {
    if (!typeIdByName.has(item.typeName)) {
      throw new Error(`Demo seed: unknown system item type "${item.typeName}"`);
    }
  }

  // One Tag row per unique name (user-scoped), shared across items.
  const tagNames = [...new Set(items.flatMap((item) => item.tags))];
  const tags = await db.tag.createManyAndReturn({
    data: tagNames.map((name) => ({ name, userId })),
    select: { id: true, name: true },
  });
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  const collections = await db.collection.createManyAndReturn({
    data: DEMO_SEED_COLLECTIONS.map((collection) => ({
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite ?? false,
      userId,
    })),
    select: { id: true, name: true },
  });
  const collectionIdByName = new Map(collections.map((c) => [c.name, c.id]));

  // Items in one batch; join rows are keyed back by title (titles are unique in
  // the seed constant — pinned by seed-data.test.ts).
  const createdItems = await db.item.createManyAndReturn({
    data: items.map((item) => ({
      title: item.title,
      content: item.content ?? null,
      language: item.language ?? null,
      url: item.url ?? null,
      description: item.description,
      isFavorite: item.isFavorite ?? false,
      isPinned: item.isPinned ?? false,
      typeId: typeIdByName.get(item.typeName)!,
      userId,
    })),
    select: { id: true, title: true },
  });
  const itemIdByTitle = new Map(createdItems.map((i) => [i.title, i.id]));

  await db.itemTag.createMany({
    data: items.flatMap((item) =>
      item.tags.map((name) => ({
        itemId: itemIdByTitle.get(item.title)!,
        tagId: tagIdByName.get(name)!,
      })),
    ),
  });

  await db.itemCollection.createMany({
    data: DEMO_SEED_COLLECTIONS.flatMap((collection) =>
      collection.items.map((item) => ({
        itemId: itemIdByTitle.get(item.title)!,
        collectionId: collectionIdByName.get(collection.name)!,
      })),
    ),
  });
}
