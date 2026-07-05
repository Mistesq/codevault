import { Pin } from "lucide-react";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/pagination";
import { getAllItemsPaginated } from "@/lib/db/items";
import { parsePageParam } from "@/lib/pagination";
import { pluralize } from "@/lib/utils";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function PinnedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePageParam((await searchParams).page);
  // Only pinned items, most recently pinned first (updatedAt desc).
  const { items, totalCount, totalPages, page: current } =
    await getAllItemsPaginated(page, { pinnedOnly: true, pinnedFirst: false });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Pin className="size-5 fill-sky-400" />}
        iconClassName="text-sky-400"
        title="Pinned"
        subtitle={pluralize(totalCount, "item")}
      />

      {totalCount > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination page={current} totalPages={totalPages} baseHref="/pinned" />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No pinned items yet. Pin an item to keep it here.
        </p>
      )}
    </div>
  );
}
