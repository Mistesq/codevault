import { Star } from "lucide-react";

import { FavoritesList } from "@/components/favorites/FavoritesList";
import { getFavoritesPage } from "@/lib/db/favorites";
import { parseFavoriteSort } from "@/lib/favorites-sort";
import { parseListTab, type ListTab } from "@/lib/list-tabs";
import { parsePageParam } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const sort = parseFavoriteSort(params.sort);
  const page = parsePageParam(params.page);

  // Honor an explicit ?tab; otherwise default to Items, but fall back to
  // Collections when there are no favorited items (so the user doesn't land on
  // an empty tab). Slicing is cheap and page defaults to 1 without an explicit
  // tab, so re-picking the active tab afterward is safe.
  const explicitTab =
    params.tab === "items" || params.tab === "collections"
      ? (params.tab as ListTab)
      : undefined;
  const requestedTab = parseListTab(params.tab, "items");

  const data = await getFavoritesPage(sort, requestedTab, page);
  const total = data.items.totalCount + data.collections.totalCount;

  const activeTab: ListTab =
    explicitTab ??
    (data.items.totalCount === 0 && data.collections.totalCount > 0
      ? "collections"
      : "items");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-amber-400">
          <Star className="size-5 fill-amber-400" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Favorites</h1>
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? "favorite" : "favorites"}
          </p>
        </div>
      </header>

      {total > 0 ? (
        <FavoritesList
          activeTab={activeTab}
          items={data.items}
          collections={data.collections}
          sort={sort}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No favorites yet. Star an item or collection to pin it here.
        </p>
      )}
    </div>
  );
}
