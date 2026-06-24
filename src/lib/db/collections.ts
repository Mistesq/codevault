import { prisma } from "@/lib/prisma";

// Until auth exists, the dashboard reads the seeded demo user's data.
const DEMO_EMAIL = "demo@codevault.io";

export interface CollectionType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface DashboardCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  // Border accent: color of the most-used content type in the collection.
  borderColor: string | null;
  // Distinct types present, most-used first (for the small type icons).
  types: CollectionType[];
}

/**
 * Fetch the demo user's collections for the dashboard "Recent Collections" grid,
 * newest first. Each collection carries its item count, the distinct item types
 * it contains, and a border color derived from its most-used type.
 */
export async function getDashboardCollections(
  limit = 6,
): Promise<DashboardCollection[]> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return [];

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      items: {
        select: {
          type: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    // Count items per type and remember each type's metadata.
    const counts = new Map<string, number>();
    const meta = new Map<string, CollectionType>();
    for (const { type } of collection.items) {
      counts.set(type.id, (counts.get(type.id) ?? 0) + 1);
      if (!meta.has(type.id)) meta.set(type.id, type);
    }

    // Distinct types, most-used first.
    const types = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([typeId]) => meta.get(typeId)!)
      .filter(Boolean);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      borderColor: types[0]?.color ?? null,
      types,
    };
  });
}
