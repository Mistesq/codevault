import { LayoutGrid } from "lucide-react";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/pagination";
import { getAllItemsPaginated } from "@/lib/db/items";
import { parsePageParam } from "@/lib/pagination";
import { pluralize } from "@/lib/utils";

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
      <PageHeader
        icon={<LayoutGrid className="size-5" />}
        title="All Items"
        subtitle={pluralize(totalCount, "item")}
      />

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
