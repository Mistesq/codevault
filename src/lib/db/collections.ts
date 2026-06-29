import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/db/user";

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

export interface SidebarCollection {
  id: string;
  name: string;
  itemCount: number;
}

/**
 * The demo user's favorite collections for the sidebar, alphabetical.
 */
export async function getFavoriteCollections(): Promise<SidebarCollection[]> {
  const user = await getDemoUser();
  if (!user) return [];

  const collections = await prisma.collection.findMany({
    where: { userId: user.id, isFavorite: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    itemCount: collection._count.items,
  }));
}

/**
 * Fetch the demo user's collections for the dashboard "Recent Collections" grid,
 * newest first. Each collection carries its item count, the distinct item types
 * it contains, and a border color derived from its most-used type.
 */
export async function getDashboardCollections(
  limit = 6,
): Promise<DashboardCollection[]> {
  const user = await getDemoUser();
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

/** Fields the New Collection dialog can set (already Zod-validated upstream). */
export interface CreateCollectionData {
  name: string;
  description: string | null;
}

/**
 * Create a new, empty collection scoped to the demo user (matching the rest of
 * the domain data, still demo-scoped until ownership is migrated). The schema's
 * `@@unique([userId, name])` is the duplicate-name guard — a clashing name
 * throws a Prisma P2002 the action turns into a friendly message. Returns the
 * created collection in the DashboardCollection shape (no items yet).
 */
export async function createCollection(
  data: CreateCollectionData,
): Promise<DashboardCollection | null> {
  const user = await getDemoUser();
  if (!user) return null;

  const created = await prisma.collection.create({
    data: {
      name: data.name,
      description: data.description,
      userId: user.id,
    },
    select: { id: true, name: true, description: true, isFavorite: true },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    isFavorite: created.isFavorite,
    itemCount: 0,
    borderColor: null,
    types: [],
  };
}
