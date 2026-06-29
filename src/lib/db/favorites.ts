import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/db/user";
import {
  itemSelect,
  toDashboardItem,
  type DashboardItem,
} from "@/lib/db/items";

/** A favorited collection, trimmed to what the favorites list row renders. */
export interface FavoriteCollection {
  id: string;
  name: string;
  itemCount: number;
  // ISO string so it crosses the server/client boundary cleanly.
  updatedAt: string;
}

export interface FavoritesData {
  items: DashboardItem[];
  collections: FavoriteCollection[];
}

/**
 * The signed-in user's favorited items and collections for the /favorites page,
 * each most recently updated first (most recently favorited surfaces nearest the
 * change). Items come back in the shared DashboardItem shape so the ItemDrawer
 * renders them; collections are trimmed to id/name/itemCount/updatedAt.
 */
export async function getFavorites(): Promise<FavoritesData> {
  const user = await getSessionUser();
  if (!user) return { items: [], collections: [] };

  const [itemRows, collectionRows] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, isFavorite: true },
      orderBy: { updatedAt: "desc" },
      select: itemSelect,
    }),
    prisma.collection.findMany({
      where: { userId: user.id, isFavorite: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    items: itemRows.map(toDashboardItem),
    collections: collectionRows.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c._count.items,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}
