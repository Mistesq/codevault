import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/db/user";
import { deleteFromR2, keyFromPublicUrl } from "@/lib/r2";
import { isAtItemLimit, PlanLimitError } from "@/lib/billing/plan";
import {
  clampPage,
  DASHBOARD_RECENT_ITEMS_LIMIT,
  ITEMS_PER_PAGE,
  pageOffset,
  totalPagesFor,
  type Paginated,
} from "@/lib/pagination";

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
  fileUrl: string | null;
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

// Shared shape of the Prisma query — keeps the item selectors in sync.
// Exported so collection queries can return items in the same DashboardItem shape.
export const itemSelect = {
  id: true,
  title: true,
  description: true,
  contentType: true,
  content: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  url: true,
  isFavorite: true,
  isPinned: true,
  updatedAt: true,
  type: { select: { name: true, icon: true, color: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const;

// Derived from itemSelect so the row shape can't drift from the query.
type ItemRow = Prisma.ItemGetPayload<{ select: typeof itemSelect }>;

// Exported so collection queries can map rows into the shared DashboardItem shape.
export function toDashboardItem(row: ItemRow): DashboardItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    contentType: row.contentType,
    content: row.content,
    fileUrl: row.fileUrl,
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
 * Pinned items for the signed-in user, most recently updated first.
 * Returns an empty array when nothing is pinned (the section then hides).
 */
export async function getPinnedItems(): Promise<DashboardItem[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const rows = await prisma.item.findMany({
    where: { userId: user.id, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });

  return rows.map(toDashboardItem);
}

/**
 * The signed-in user's most recently updated items for the "Recent Items" grid.
 */
export async function getRecentItems(
  limit = DASHBOARD_RECENT_ITEMS_LIMIT,
): Promise<DashboardItem[]> {
  const user = await getSessionUser();
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
 * Every item the signed-in user owns, most recently updated first — the source
 * data for the command palette's client-side fuzzy search.
 */
export async function getAllItems(): Promise<DashboardItem[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const rows = await prisma.item.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });

  return rows.map(toDashboardItem);
}

/**
 * A single page of the signed-in user's items — the source data for the All
 * Items route (`pinnedFirst`, the default), the Recently Used page's items
 * section (`pinnedFirst: false`, pure recency), and the Pinned page
 * (`pinnedOnly: true`, only pinned items). Only the requested page is fetched
 * (count + skip/take); the requested page is clamped into range so a too-high
 * `?page=` lands on the last page. Returns an empty page when signed out.
 */
export async function getAllItemsPaginated(
  page = 1,
  {
    pinnedFirst = true,
    pinnedOnly = false,
  }: { pinnedFirst?: boolean; pinnedOnly?: boolean } = {},
): Promise<Paginated<DashboardItem>> {
  const user = await getSessionUser();
  if (!user) return { items: [], page: 1, totalPages: 1, totalCount: 0 };

  const where = pinnedOnly
    ? { userId: user.id, isPinned: true }
    : { userId: user.id };
  const totalCount = await prisma.item.count({ where });
  const totalPages = totalPagesFor(totalCount, ITEMS_PER_PAGE);
  const current = clampPage(page, totalPages);

  const rows = await prisma.item.findMany({
    where,
    // All Items surfaces pinned items first; Recently Used wants pure recency.
    orderBy: pinnedFirst
      ? [{ isPinned: "desc" }, { updatedAt: "desc" }]
      : { updatedAt: "desc" },
    skip: pageOffset(current, ITEMS_PER_PAGE),
    take: ITEMS_PER_PAGE,
    select: itemSelect,
  });

  return {
    items: rows.map(toDashboardItem),
    page: current,
    totalPages,
    totalCount,
  };
}

/**
 * Full item detail for the item drawer — the card's fields plus the extras that
 * are only fetched on click (content lives on the card too today, but the drawer
 * treats it as detail so the card query can drop it later). Dates are ISO so the
 * shape crosses the API/server-client boundary cleanly.
 */
export interface ItemDetail extends DashboardItem {
  language: string | null;
  // The collections this item belongs to (many-to-many). Empty when unfiled.
  collections: { id: string; name: string }[];
  createdAt: string;
}

const itemDetailSelect = {
  ...itemSelect,
  language: true,
  createdAt: true,
  collections: { select: { collection: { select: { id: true, name: true } } } },
} as const;

/**
 * Full detail for a single item, scoped to the signed-in user (matching the cards).
 * Returns null when the item doesn't exist or isn't the signed-in user's — the API
 * route turns that into a 404.
 */
export async function getItemDetail(id: string): Promise<ItemDetail | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const row = await prisma.item.findFirst({
    where: { id, userId: user.id },
    select: itemDetailSelect,
  });
  if (!row) return null;

  return {
    ...toDashboardItem(row),
    language: row.language,
    createdAt: row.createdAt.toISOString(),
    collections: row.collections.map((c) => c.collection),
  };
}

/** Fields for creating an item from the New Item dialog (Zod-validated upstream). */
export interface CreateItemData {
  // System ItemType.name, e.g. "snippet", "URL", "file", "image".
  type: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  // Set for the file/image types (uploaded to R2 beforehand); null otherwise.
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  tags: string[];
  // Collections this item should belong to (ownership verified before linking).
  collectionIds: string[];
}

// System type names whose items store an uploaded file (contentType FILE).
const FILE_TYPE_NAMES = new Set(["file", "image"]);

/**
 * Connect-or-create each tag (tags are unique per user) and link it to the item,
 * inside the given transaction. Shared by createItem and updateItem. Exported for
 * unit testing.
 */
export async function linkTags(
  tx: Prisma.TransactionClient,
  userId: string,
  itemId: string,
  tagNames: string[],
): Promise<void> {
  for (const name of tagNames) {
    const tag = await tx.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { name, userId },
      update: {},
    });
    await tx.itemTag.create({ data: { itemId, tagId: tag.id } });
  }
}

/**
 * Link the item to each of the given collections (many-to-many), inside the
 * given transaction. Ownership is enforced: only collections that belong to the
 * user are linked, so a forged/foreign collection id is silently ignored.
 * Shared by createItem and updateItem. Exported for unit testing.
 */
export async function linkCollections(
  tx: Prisma.TransactionClient,
  userId: string,
  itemId: string,
  collectionIds: string[],
): Promise<void> {
  if (collectionIds.length === 0) return;

  const owned = await tx.collection.findMany({
    where: { id: { in: collectionIds }, userId },
    select: { id: true },
  });
  if (owned.length === 0) return;

  await tx.itemCollection.createMany({
    data: owned.map((c) => ({ itemId, collectionId: c.id })),
  });
}

/**
 * Create a new item for the signed-in user. Resolves the chosen type name to its system ItemType and
 * returns null when it doesn't exist (so the action can error). File/image
 * types are stored as contentType FILE with the R2 file metadata; everything
 * else is TEXT. Tags are connect-or-created (unique per user) in the same
 * transaction. Returns the fresh ItemDetail so the caller doesn't need a second
 * fetch.
 */
export async function createItem(
  data: CreateItemData,
): Promise<ItemDetail | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const type = await prisma.itemType.findFirst({
    where: { isSystem: true, name: data.type },
    select: { id: true },
  });
  if (!type) return null;

  // Free-tier gating (Pro is unlimited). Enforced here — where the session user
  // (with isPro) is already resolved — so it can't be bypassed by any caller.
  const count = await prisma.item.count({ where: { userId: user.id } });
  if (isAtItemLimit(user.isPro, count)) {
    throw new PlanLimitError("item");
  }

  const isFile = FILE_TYPE_NAMES.has(data.type);

  // File uploads are Pro-only (images stay free). Mirrors the /api/upload guard
  // so a forged createItem call can't bypass the route.
  if (data.type === "file" && !user.isPro) {
    throw new PlanLimitError("file");
  }

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.item.create({
      data: {
        title: data.title,
        description: data.description,
        content: isFile ? null : data.content,
        url: isFile ? null : data.url,
        language: isFile ? null : data.language,
        fileUrl: isFile ? data.fileUrl : null,
        fileName: isFile ? data.fileName : null,
        fileSize: isFile ? data.fileSize : null,
        contentType: isFile ? "FILE" : "TEXT",
        userId: user.id,
        typeId: type.id,
      },
      select: { id: true },
    });

    await linkTags(tx, user.id, item.id, data.tags);
    await linkCollections(tx, user.id, item.id, data.collectionIds);

    return item;
  });

  return getItemDetail(created.id);
}

/** Fields the drawer's edit mode can change (already Zod-validated upstream). */
export interface UpdateItemData {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  // The item's full collection membership after the edit (replaces the old set).
  collectionIds: string[];
}

/**
 * Update an item's editable fields and its tag set, scoped to the signed-in user
 * (matching getItemDetail). Ownership is the
 * guard: an id that isn't the signed-in user's returns null, which the action turns
 * into an error. Tag handling per spec: disconnect all existing ItemTags, then
 * connect-or-create each new tag (tags are unique per user). Returns the fresh
 * ItemDetail so the drawer can refresh without a second fetch.
 */
export async function updateItem(
  id: string,
  data: UpdateItemData,
): Promise<ItemDetail | null> {
  const user = await getSessionUser();
  if (!user) return null;

  // Ownership check — only the signed-in user's own item may be edited.
  const existing = await prisma.item.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    await tx.item.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
      },
    });

    // Disconnect all existing tags, then connect-or-create the new set.
    await tx.itemTag.deleteMany({ where: { itemId: id } });
    await linkTags(tx, user.id, id, data.tags);

    // Replace collection membership with the new (ownership-checked) set.
    await tx.itemCollection.deleteMany({ where: { itemId: id } });
    await linkCollections(tx, user.id, id, data.collectionIds);
  });

  return getItemDetail(id);
}

/**
 * Permanently delete an item, scoped to the signed-in user (ownership is the guard,
 * matching updateItem). `deleteMany` with a user-scoped where never throws on a
 * missing/foreign id — it reports `count: 0`, which we surface as false so the
 * action can return "Item not found." ItemTag rows cascade on delete per schema.
 * For file/image items, the backing R2 object is removed after the row is gone
 * (best-effort — a failed R2 delete is logged but doesn't fail the operation).
 */
export async function deleteItem(id: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  // Read the file URL first so we can clean up R2 after the row is deleted.
  const existing = await prisma.item.findFirst({
    where: { id, userId: user.id },
    select: { fileUrl: true },
  });

  const { count } = await prisma.item.deleteMany({
    where: { id, userId: user.id },
  });
  if (count === 0) return false;

  if (existing?.fileUrl) {
    const key = keyFromPublicUrl(existing.fileUrl);
    if (key) await deleteFromR2(key);
  }

  return true;
}

/**
 * Toggle an item's favorite flag, scoped to the signed-in user (ownership is the
 * guard, matching updateItem/deleteItem). `updateMany` with the userId filter
 * makes a non-owner / missing id a no-op — count 0 → false, which the action
 * surfaces as not-found.
 */
export async function setItemFavorite(
  id: string,
  isFavorite: boolean,
): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const { count } = await prisma.item.updateMany({
    where: { id, userId: user.id },
    data: { isFavorite },
  });

  return count > 0;
}

/**
 * Toggle an item's pinned flag, scoped to the signed-in user (ownership is the
 * guard, matching setItemFavorite). `updateMany` with the userId filter makes a
 * non-owner / missing id a no-op — count 0 → false, which the action surfaces as
 * not-found.
 */
export async function setItemPinned(
  id: string,
  isPinned: boolean,
): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const { count } = await prisma.item.updateMany({
    where: { id, userId: user.id },
    data: { isPinned },
  });

  return count > 0;
}

export interface ItemTypeView {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ItemsByTypeResult extends Paginated<DashboardItem> {
  type: ItemTypeView;
}

/**
 * Resolve a plural type slug (e.g. "snippets", "urls") to its system item type
 * and a single page of the signed-in user's items of that type, most recently
 * updated first. Returns null when the slug matches no system type (so the
 * route can 404). Only the requested page is fetched (count + skip/take); the
 * requested page is clamped into range so a too-high `?page=` lands on the last
 * page.
 */
export async function getItemsByTypeSlug(
  slug: string,
  page = 1,
): Promise<ItemsByTypeResult | null> {
  const normalized = slug.toLowerCase();

  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: { id: true, name: true, icon: true, color: true },
  });
  // Mirrors the sidebar's typeSlug(): lowercase name + trailing "s".
  const type = types.find((t) => `${t.name.toLowerCase()}s` === normalized);
  if (!type) return null;

  const user = await getSessionUser();
  if (!user) return { type, items: [], page: 1, totalPages: 1, totalCount: 0 };

  const where = { userId: user.id, typeId: type.id };
  const totalCount = await prisma.item.count({ where });
  const totalPages = totalPagesFor(totalCount, ITEMS_PER_PAGE);
  const current = clampPage(page, totalPages);

  const rows = await prisma.item.findMany({
    where,
    // Pinned items surface at the top of the listing, then most recent first.
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    skip: pageOffset(current, ITEMS_PER_PAGE),
    take: ITEMS_PER_PAGE,
    select: itemSelect,
  });

  return {
    type,
    items: rows.map(toDashboardItem),
    page: current,
    totalPages,
    totalCount,
  };
}

/**
 * Aggregate counts for the dashboard stats cards (items, collections, and
 * favorites of each), scoped to the signed-in user.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await getSessionUser();
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

// Exported so other type-breakdown views (e.g. the profile page) share one order.
export function typeOrderIndex(name: string): number {
  const i = SYSTEM_TYPE_ORDER.indexOf(name.toLowerCase());
  return i === -1 ? SYSTEM_TYPE_ORDER.length : i;
}

/**
 * System item types (shared across all users) for the sidebar "Types" section,
 * each with the signed-in user's item count of that type. Ordered to match the
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

  const user = await getSessionUser();
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
 * scoped to the signed-in user.
 */
export async function getSidebarItemCounts(): Promise<SidebarItemCounts> {
  const user = await getSessionUser();
  if (!user) return { total: 0, favorites: 0, pinned: 0 };

  const [total, favorites, pinned] = await Promise.all([
    prisma.item.count({ where: { userId: user.id } }),
    prisma.item.count({ where: { userId: user.id, isFavorite: true } }),
    prisma.item.count({ where: { userId: user.id, isPinned: true } }),
  ]);

  return { total, favorites, pinned };
}
