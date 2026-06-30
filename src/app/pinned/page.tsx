import { Pin } from "lucide-react";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { getPinnedItems } from "@/lib/db/items";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function PinnedPage() {
  // Already sorted by most recently pinned (updatedAt desc).
  const items = await getPinnedItems();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-sky-400">
          <Pin className="size-5 fill-sky-400" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Pinned</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No pinned items yet. Pin an item to keep it here.
        </p>
      )}
    </div>
  );
}
