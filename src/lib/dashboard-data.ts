// Derived selectors over the mock data for the dashboard main area.
// Pure functions over the static arrays — swap the source for Prisma later.

import {
  collections,
  items,
  itemTypes,
  type Collection,
  type Item,
  type ItemType,
} from "./mock-data";

export interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  favoriteItems: number;
  favoriteCollections: number;
}

export function getStats(): DashboardStats {
  return {
    totalItems: items.length,
    totalCollections: collections.length,
    favoriteItems: items.filter((i) => i.isFavorite).length,
    favoriteCollections: collections.filter((c) => c.isFavorite).length,
  };
}

export function getPinnedItems(): Item[] {
  return items.filter((i) => i.isPinned);
}

export function getRecentItems(limit = 10): Item[] {
  return [...items]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}

export function getRecentCollections(limit = 4): Collection[] {
  // Order by the most recent activity of the items each collection contains,
  // since collections themselves carry no timestamp yet.
  const latestActivity = new Map<string, number>();
  for (const item of items) {
    if (!item.collectionId) continue;
    const time = new Date(item.updatedAt).getTime();
    if (time > (latestActivity.get(item.collectionId) ?? 0)) {
      latestActivity.set(item.collectionId, time);
    }
  }
  return [...collections]
    .sort(
      (a, b) =>
        (latestActivity.get(b.id) ?? 0) - (latestActivity.get(a.id) ?? 0),
    )
    .slice(0, limit);
}

const typeById = new Map(itemTypes.map((type) => [type.id, type]));

export function getItemType(typeId: string): ItemType | undefined {
  return typeById.get(typeId);
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
