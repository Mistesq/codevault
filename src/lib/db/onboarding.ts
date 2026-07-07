import { prisma } from "@/lib/prisma";
import { linkTags } from "@/lib/db/items";
import { STARTER_COLLECTIONS } from "@/lib/onboarding-content";

/**
 * Seed a freshly created account with the starter collections/items from
 * onboarding-content.ts so the first dashboard visit isn't empty.
 *
 * Called right after user creation (credentials register route and the
 * NextAuth `createUser` event for OAuth sign-ups). Deliberately never throws —
 * a seeding failure must not fail registration — and is a no-op for any user
 * who already owns items or collections, so a double fire can't duplicate
 * content.
 */
export async function seedNewUserData(userId: string): Promise<void> {
  try {
    const [itemCount, collectionCount] = await Promise.all([
      prisma.item.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
    ]);
    if (itemCount > 0 || collectionCount > 0) return;

    const types = await prisma.itemType.findMany({
      where: { isSystem: true },
      select: { id: true, name: true },
    });
    const typeIdByName = new Map(types.map((t) => [t.name, t.id]));

    await prisma.$transaction(
      async (tx) => {
        for (const starter of STARTER_COLLECTIONS) {
          const collection = await tx.collection.create({
            data: {
              name: starter.name,
              description: starter.description,
              userId,
            },
            select: { id: true },
          });

          for (const item of starter.items) {
            const typeId = typeIdByName.get(item.type);
            // Unresolvable type (e.g. system types not seeded yet) — skip the
            // item rather than abort the whole starter set.
            if (!typeId) continue;

            const created = await tx.item.create({
              data: {
                title: item.title,
                content: item.content ?? null,
                language: item.language ?? null,
                url: item.url ?? null,
                description: item.description ?? null,
                isPinned: item.isPinned ?? false,
                isFavorite: item.isFavorite ?? false,
                typeId,
                userId,
              },
              select: { id: true },
            });

            await tx.itemCollection.create({
              data: { itemId: created.id, collectionId: collection.id },
            });

            if (item.tags?.length) {
              await linkTags(tx, userId, created.id, item.tags);
            }
          }
        }
      },
      // ~50 sequential queries over a remote pool — give it more headroom than
      // the 5s interactive-transaction default.
      { timeout: 15000 },
    );
  } catch (error) {
    console.error("Starter data seeding failed:", error);
  }
}
