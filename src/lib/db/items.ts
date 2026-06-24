import { prisma } from "@/lib/prisma";

// Until auth exists, the dashboard reads the seeded demo user's data.
const DEMO_EMAIL = "demo@codevault.io";

export interface DashboardItemType {
  name: string;
  // lucide icon-name string, resolved in the UI via getTypeIcon().
  icon: string | null;
  color: string | null;
}

export interface DashboardItem {
  id: string;
  title: string;
  description: string | null;
  contentType: "TEXT" | "FILE";
  content: string | null;
  fileName: string | null;
  fileSize: number | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  // Tag names, for the #hashtag chips.
  tags: string[];
  // ISO string so it crosses the server/client boundary cleanly.
  updatedAt: string;
  // Drives the card icon/accent.
  type: DashboardItemType;
}

export interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  favoriteItems: number;
  favoriteCollections: number;
}

export interface SidebarItemType {
  id: string;
  name: string;
  // lucide icon-name string, resolved in the UI via getTypeIcon().
  icon: string | null;
  color: string | null;
  // Number of the user's items of this type.
  count: number;
}

export interface SidebarItemCounts {
  total: number;
  favorites: number;
  pinned: number;
}

// Shared shape of the Prisma query — keeps the two item selectors in sync.
const itemSelect = {
  id: true,
  title: true,
  description: true,
  contentType: true,
  content: true,
  fileName: true,
  fileSize: true,
  url: true,
  isFavorite: true,
  isPinned: true,
  updatedAt: true,
  type: { select: { name: true, icon: true, color: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const;

type ItemRow = {
  id: string;
  title: string;
  description: string | null;
  contentType: "TEXT" | "FILE";
  content: string | null;
  fileName: string | null;
  fileSize: number | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: Date;
  type: { name: string; icon: string | null; color: string | null };
  tags: { tag: { name: string } }[];
};

function toDashboardItem(row: ItemRow): DashboardItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    contentType: row.contentType,
    content: row.content,
    fileName: row.fileName,
    fileSize: row.fileSize,
    url: row.url,
    isFavorite: row.isFavorite,
    isPinned: row.isPinned,
    tags: row.tags.map((t) => t.tag.name),
    updatedAt: row.updatedAt.toISOString(),
    type: row.type,
  };
}

/**
 * Pinned items for the demo user, most recently updated first.
 * Returns an empty array when nothing is pinned (the section then hides).
 */
export async function getPinnedItems(): Promise<DashboardItem[]> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return [];

  const rows = await prisma.item.findMany({
    where: { userId: user.id, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });

  return rows.map(toDashboardItem);
}

/**
 * The demo user's most recently updated items for the "Recent Items" grid.
 */
export async function getRecentItems(limit = 10): Promise<DashboardItem[]> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return [];

  const rows = await prisma.item.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: itemSelect,
  });

  return rows.map(toDashboardItem);
}

/**
 * Aggregate counts for the dashboard stats cards (items, collections, and
 * favorites of each), scoped to the demo user.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    return {
      totalItems: 0,
      totalCollections: 0,
      favoriteItems: 0,
      favoriteCollections: 0,
    };
  }

  const [totalItems, totalCollections, favoriteItems, favoriteCollections] =
    await Promise.all([
      prisma.item.count({ where: { userId: user.id } }),
      prisma.collection.count({ where: { userId: user.id } }),
      prisma.item.count({ where: { userId: user.id, isFavorite: true } }),
      prisma.collection.count({ where: { userId: user.id, isFavorite: true } }),
    ]);

  return { totalItems, totalCollections, favoriteItems, favoriteCollections };
}

// Display order for the sidebar "Types" section (the table has no sort column).
// Lowercased type names; anything not listed falls to the end alphabetically.
const SYSTEM_TYPE_ORDER = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "url",
];

function typeOrderIndex(name: string): number {
  const i = SYSTEM_TYPE_ORDER.indexOf(name.toLowerCase());
  return i === -1 ? SYSTEM_TYPE_ORDER.length : i;
}

/**
 * System item types (shared across all users) for the sidebar "Types" section,
 * each with the demo user's item count of that type. Ordered to match the
 * sidebar's intended layout (see SYSTEM_TYPE_ORDER).
 */
export async function getSystemItemTypes(): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: { id: true, name: true, icon: true, color: true },
  });

  types.sort((a, b) => {
    const order = typeOrderIndex(a.name) - typeOrderIndex(b.name);
    return order !== 0 ? order : a.name.localeCompare(b.name);
  });

  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return types.map((type) => ({ ...type, count: 0 }));

  // One grouped query for all per-type counts, then merge by type id.
  const grouped = await prisma.item.groupBy({
    by: ["typeId"],
    where: { userId: user.id },
    _count: { _all: true },
  });
  const countByType = new Map(grouped.map((g) => [g.typeId, g._count._all]));

  return types.map((type) => ({
    ...type,
    count: countByType.get(type.id) ?? 0,
  }));
}

/**
 * Item counts for the sidebar's All Items / Favorites / Pinned rows,
 * scoped to the demo user.
 */
export async function getSidebarItemCounts(): Promise<SidebarItemCounts> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return { total: 0, favorites: 0, pinned: 0 };

  const [total, favorites, pinned] = await Promise.all([
    prisma.item.count({ where: { userId: user.id } }),
    prisma.item.count({ where: { userId: user.id, isFavorite: true } }),
    prisma.item.count({ where: { userId: user.id, isPinned: true } }),
  ]);

  return { total, favorites, pinned };
}
