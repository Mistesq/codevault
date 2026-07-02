import type { DashboardItem } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/favorites";

/** Which field the favorites list is ordered by. */
export type FavoriteSortKey = "name" | "date" | "type";

/** Ascending or descending. */
export type FavoriteSortDir = "asc" | "desc";

export interface FavoriteSort {
  key: FavoriteSortKey;
  dir: FavoriteSortDir;
}

/** Matches the server's default order: most recently updated first. */
export const DEFAULT_FAVORITE_SORT: FavoriteSort = { key: "date", dir: "desc" };

/** Sort keys in the order they appear in the control. */
export const FAVORITE_SORT_OPTIONS: { value: FavoriteSortKey; label: string }[] =
  [
    { value: "name", label: "Name" },
    { value: "date", label: "Date" },
    { value: "type", label: "Type" },
  ];

/**
 * The direction a key defaults to when first selected — names/types read most
 * naturally A→Z, while dates read newest-first.
 */
export function defaultDirFor(key: FavoriteSortKey): FavoriteSortDir {
  return key === "date" ? "desc" : "asc";
}

const SORT_KEYS: FavoriteSortKey[] = ["name", "date", "type"];

/**
 * Serialize a sort into the `?sort=` URL value, e.g. `{ key: "name", dir:
 * "asc" }` → `"name-asc"`.
 */
export function serializeFavoriteSort(sort: FavoriteSort): string {
  return `${sort.key}-${sort.dir}`;
}

/**
 * Parse a `?sort=` value (e.g. `"name-asc"`) back into a FavoriteSort. Anything
 * malformed, unknown, or missing (including arrays) falls back to the default
 * sort, so the page always has a valid ordering.
 */
export function parseFavoriteSort(
  value: string | string[] | undefined,
): FavoriteSort {
  const raw = Array.isArray(value) ? value[0] : value;
  const [key, dir] = (raw ?? "").split("-");
  if (
    SORT_KEYS.includes(key as FavoriteSortKey) &&
    (dir === "asc" || dir === "desc")
  ) {
    return { key: key as FavoriteSortKey, dir };
  }
  return DEFAULT_FAVORITE_SORT;
}

/** Whether a sort is the default (date desc) — used to keep URLs clean. */
export function isDefaultFavoriteSort(sort: FavoriteSort): boolean {
  return (
    sort.key === DEFAULT_FAVORITE_SORT.key &&
    sort.dir === DEFAULT_FAVORITE_SORT.dir
  );
}

// Case-insensitive name compare.
function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

// ISO 8601 strings compare chronologically under a plain lexicographic compare.
function byDate(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Order favorited items by the chosen sort. Returns a new array (never mutates
 * the input). Type sort tie-breaks on title so same-type items stay alphabetical.
 */
export function sortFavoriteItems(
  items: DashboardItem[],
  sort: FavoriteSort,
): DashboardItem[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let cmp: number;
    switch (sort.key) {
      case "name":
        cmp = byName(a.title, b.title);
        break;
      case "type":
        cmp = byName(a.type.name, b.type.name) || byName(a.title, b.title);
        break;
      case "date":
      default:
        cmp = byDate(a.updatedAt, b.updatedAt);
        break;
    }
    return cmp * factor;
  });
}

/**
 * Order favorited collections by the chosen sort. Collections have no type, so a
 * "type" sort falls back to ordering them by name.
 */
export function sortFavoriteCollections(
  collections: FavoriteCollection[],
  sort: FavoriteSort,
): FavoriteCollection[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...collections].sort((a, b) => {
    let cmp: number;
    switch (sort.key) {
      case "name":
      case "type":
        cmp = byName(a.name, b.name);
        break;
      case "date":
      default:
        cmp = byDate(a.updatedAt, b.updatedAt);
        break;
    }
    return cmp * factor;
  });
}
