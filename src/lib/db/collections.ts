import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/db/user";
import {
  itemSelect,
  toDashboardItem,
  type DashboardItem,
} from "@/lib/db/items";
import { isAtCollectionLimit, PlanLimitError } from "@/lib/billing/plan";
import {
  COLLECTIONS_PER_PAGE,
  DASHBOARD_COLLECTIONS_LIMIT,
  ITEMS_PER_PAGE,
  paginatePrismaQuery,
  type Paginated,
} from "@/lib/pagination";

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

/** Minimal collection shape for the item form's collection picker. */
export interface SelectableCollection {
  id: string;
  name: string;
}

/**
 * The signed-in user's collections (id + name only), alphabetical, for the
 * multi-select on the New/Edit Item forms.
 */
export async function getSelectableCollections(): Promise<
  SelectableCollection[]
> {
  const user = await getSessionUser();
  if (!user) return [];

  return prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * The signed-in user's favorite collections for the sidebar, alphabetical.
 */
export async function getFavoriteCollections(): Promise<SidebarCollection[]> {
  const user = await getSessionUser();
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

// Card include: the item count via `_count` (so we never transfer item rows just
// to count them) plus each membership's item typeId only (a single cuid per
// membership rather than the full type object). Type metadata (name/icon/color)
// is resolved once per page in mapCollectionCards.
const collectionCardInclude = {
  _count: { select: { items: true } },
  items: { select: { item: { select: { typeId: true } } } },
} as const;

// Derived from the include so the row shape can't drift from the query.
type CollectionCardRow = Prisma.CollectionGetPayload<{
  include: typeof collectionCardInclude;
}>;

/**
 * Map a collection row into the DashboardCollection shape used by the card,
 * resolving each membership's typeId against a shared type-metadata map (built
 * once per page so this stays a pure, synchronous mapper).
 */
function toDashboardCollection(
  collection: CollectionCardRow,
  typeMetaById: Map<string, CollectionType>,
): DashboardCollection {
  // Count items per type.
  const counts = new Map<string, number>();
  for (const { item } of collection.items) {
    counts.set(item.typeId, (counts.get(item.typeId) ?? 0) + 1);
  }

  // Distinct types, most-used first, resolved to their metadata.
  const types = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([typeId]) => typeMetaById.get(typeId))
    .filter((t): t is CollectionType => Boolean(t));

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    itemCount: collection._count.items,
    borderColor: types[0]?.color ?? null,
    types,
  };
}

/**
 * Map a page of collection rows into DashboardCollections. Resolves the type
 * metadata for every distinct type present in the page with a single query, so
 * the card query itself only carries typeIds (not repeated name/icon/color per
 * item membership).
 */
async function mapCollectionCards(
  rows: CollectionCardRow[],
): Promise<DashboardCollection[]> {
  const typeIds = new Set<string>();
  for (const row of rows) {
    for (const { item } of row.items) typeIds.add(item.typeId);
  }

  const typeMeta = typeIds.size
    ? await prisma.itemType.findMany({
        where: { id: { in: [...typeIds] } },
        select: { id: true, name: true, icon: true, color: true },
      })
    : [];
  const typeMetaById = new Map(typeMeta.map((t) => [t.id, t]));

  return rows.map((row) => toDashboardCollection(row, typeMetaById));
}

/**
 * Fetch the signed-in user's collections for the dashboard "Recent Collections" grid,
 * newest first. Each collection carries its item count, the distinct item types
 * it contains, and a border color derived from its most-used type.
 */
export async function getDashboardCollections(
  limit = DASHBOARD_COLLECTIONS_LIMIT,
): Promise<DashboardCollection[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: collectionCardInclude,
  });

  return mapCollectionCards(collections);
}

/**
 * Every collection the signed-in user owns, newest first, for the /collections page.
 * Same DashboardCollection shape as the dashboard grid, just unbounded.
 */
export async function getAllCollections(): Promise<DashboardCollection[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: collectionCardInclude,
  });

  return mapCollectionCards(collections);
}

/**
 * A single page of the signed-in user's collections, newest first, for the
 * /collections page. Same DashboardCollection shape as the dashboard grid, plus
 * pagination metadata. Only the requested page is fetched (count + skip/take),
 * with the page clamped into range.
 */
export async function getPaginatedCollections(
  page = 1,
): Promise<Paginated<DashboardCollection>> {
  const user = await getSessionUser();
  if (!user) return { items: [], page: 1, totalPages: 1, totalCount: 0 };

  const where = { userId: user.id };

  return paginatePrismaQuery({
    page,
    perPage: COLLECTIONS_PER_PAGE,
    count: () => prisma.collection.count({ where }),
    findMany: (skip, take) =>
      prisma.collection.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
        include: collectionCardInclude,
      }),
    map: (collections) => mapCollectionCards(collections),
  });
}

export interface CollectionWithItems extends Paginated<DashboardItem> {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

/**
 * A single collection plus one page of its items, scoped to the signed-in user
 * (ownership is the guard). Returns null when the id doesn't exist or isn't the
 * signed-in user's, so the route can 404. Items come through the ItemCollection
 * join in the shared DashboardItem shape so the existing item cards render them.
 * Only the requested page of items is fetched (count + skip/take), with the page
 * clamped into range.
 */
export async function getCollectionWithItems(
  id: string,
  page = 1,
): Promise<CollectionWithItems | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const collection = await prisma.collection.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
  if (!collection) return null;

  const where = {
    userId: user.id,
    collections: { some: { collectionId: id } },
  };

  const paged = await paginatePrismaQuery({
    page,
    perPage: ITEMS_PER_PAGE,
    count: () => prisma.item.count({ where }),
    findMany: (skip, take) =>
      prisma.item.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
        select: itemSelect,
      }),
    map: (rows) => rows.map(toDashboardItem),
  });

  return { ...collection, ...paged };
}

/** Fields the New Collection dialog can set (already Zod-validated upstream). */
export interface CreateCollectionData {
  name: string;
  description: string | null;
}

/**
 * Create a new, empty collection scoped to the signed-in user. The schema's
 * `@@unique([userId, name])` is the duplicate-name guard — a clashing name
 * throws a Prisma P2002 the action turns into a friendly message. Returns the
 * created collection in the DashboardCollection shape (no items yet).
 */
export async function createCollection(
  data: CreateCollectionData,
): Promise<DashboardCollection | null> {
  const user = await getSessionUser();
  if (!user) return null;

  // Free-tier gating (Pro is unlimited). Enforced here — where the session user
  // (with isPro) is already resolved — so it can't be bypassed by any caller.
  const count = await prisma.collection.count({ where: { userId: user.id } });
  if (isAtCollectionLimit(user.isPro, count)) {
    throw new PlanLimitError("collection");
  }

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

/** Fields the Edit Collection dialog can change (already Zod-validated upstream). */
export interface UpdateCollectionData {
  name: string;
  description: string | null;
}

/**
 * Rename / re-describe a collection, scoped to the signed-in user (ownership is
 * the guard). `updateMany` with a userId filter means a non-owner (or missing
 * id) is a no-op — count 0 → returns false. A clashing name throws Prisma P2002
 * (`@@unique([userId, name])`) for the action to translate.
 */
export async function updateCollection(
  id: string,
  data: UpdateCollectionData,
): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const { count } = await prisma.collection.updateMany({
    where: { id, userId: user.id },
    data: { name: data.name, description: data.description },
  });

  return count > 0;
}

/**
 * Toggle a collection's favorite flag, scoped to the signed-in user (ownership
 * is the guard, matching updateCollection/deleteCollection). `updateMany` with
 * the userId filter makes a non-owner / missing id a no-op — count 0 → false,
 * which the action surfaces as not-found.
 */
export async function setCollectionFavorite(
  id: string,
  isFavorite: boolean,
): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const { count } = await prisma.collection.updateMany({
    where: { id, userId: user.id },
    data: { isFavorite },
  });

  return count > 0;
}

/**
 * Delete a collection, scoped to the signed-in user. Only the collection row and
 * its ItemCollection membership rows go away (the join cascades) — the items
 * themselves are never touched. `deleteMany` with the userId filter makes a
 * non-owner / missing id a no-op (count 0 → false).
 */
export async function deleteCollection(id: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const { count } = await prisma.collection.deleteMany({
    where: { id, userId: user.id },
  });

  return count > 0;
}
