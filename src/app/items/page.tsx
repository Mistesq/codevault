import { LayoutGrid } from "lucide-react";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { Pagination } from "@/components/ui/pagination";
import { getAllItemsPaginated } from "@/lib/db/items";
import { parsePageParam } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function AllItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePageParam((await searchParams).page);
  const { items, totalCount, totalPages, page: current } =
    await getAllItemsPaginated(page);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <LayoutGrid className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">All Items</h1>
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {totalCount > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination page={current} totalPages={totalPages} baseHref="/items" />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No items yet. Create your first item to see it here.
        </p>
      )}
    </div>
  );
}
