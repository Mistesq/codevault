import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/db/user";
import {
  itemSelect,
  toDashboardItem,
  type DashboardItem,
} from "@/lib/db/items";
import {
  ITEMS_PER_PAGE,
  COLLECTIONS_PER_PAGE,
  paginateArray,
  type Paginated,
} from "@/lib/pagination";
import {
  sortFavoriteCollections,
  sortFavoriteItems,
  type FavoriteSort,
} from "@/lib/favorites-sort";
import type { ListTab } from "@/lib/list-tabs";

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

/**
 * The favorites page's data for the tabbed layout. Both sections carry their
 * totalCount (for the tab badges), but only the active tab is paginated to the
 * requested `page`; the inactive tab is sliced to page 1 (its rows aren't
 * rendered — just its count is used). `activeTab` echoes the requested tab.
 */
export interface PaginatedFavorites {
  activeTab: ListTab;
  items: Paginated<DashboardItem>;
  collections: Paginated<FavoriteCollection>;
}

/**
 * The favorites page's data: the full favorites set is fetched (it's bounded per
 * user), ordered in memory by the shared sort helpers so tie-breaks match the
 * sort control exactly, then sliced. Only one list shows at a time (tabs), so
 * only the active tab uses `page`; the other is sliced to page 1 for its count.
 */
export async function getFavoritesPage(
  sort: FavoriteSort,
  tab: ListTab,
  page = 1,
): Promise<PaginatedFavorites> {
  const { items, collections } = await getFavorites();

  return {
    activeTab: tab,
    items: paginateArray(
      sortFavoriteItems(items, sort),
      tab === "items" ? page : 1,
      ITEMS_PER_PAGE,
    ),
    collections: paginateArray(
      sortFavoriteCollections(collections, sort),
      tab === "collections" ? page : 1,
      COLLECTIONS_PER_PAGE,
    ),
  };
}
