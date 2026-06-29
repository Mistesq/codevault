import { getAllCollections } from "@/lib/db/collections";
import { getAllItems, type DashboardItem } from "@/lib/db/items";

/** Minimal collection shape the command palette needs (id + name + item count). */
export interface SearchCollection {
  id: string;
  name: string;
  itemCount: number;
}

export interface SearchData {
  items: DashboardItem[];
  collections: SearchCollection[];
}

/**
 * Pre-fetched data for the global command palette: every item (full
 * DashboardItem so selecting one can open the drawer immediately) and every
 * collection trimmed to id/name/itemCount. Reuses the existing list queries so
 * scoping/ownership stays consistent; fetched once in the app shell on load.
 */
export async function getSearchData(): Promise<SearchData> {
  const [items, collections] = await Promise.all([
    getAllItems(),
    getAllCollections(),
  ]);

  return {
    items,
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c.itemCount,
    })),
  };
}
