import { Star } from "lucide-react";

import { FavoritesList } from "@/components/favorites/FavoritesList";
import { getFavorites } from "@/lib/db/favorites";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { items, collections } = await getFavorites();
  const total = items.length + collections.length;

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
        <FavoritesList items={items} collections={collections} />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No favorites yet. Star an item or collection to pin it here.
        </p>
      )}
    </div>
  );
}
