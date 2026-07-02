import { Clock, Folder } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { Pagination } from "@/components/ui/pagination";
import { getPaginatedCollections } from "@/lib/db/collections";
import { getAllItemsPaginated } from "@/lib/db/items";
import { parsePageParam } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Promise<{ itemsPage?: string; collectionsPage?: string }>;
}) {
  const params = await searchParams;
  const itemsPage = parsePageParam(params.itemsPage);
  const collectionsPage = parsePageParam(params.collectionsPage);

  // Both ordered updatedAt desc (pure recency) — "recently used". The two
  // sections page independently via distinct query params.
  const [items, collections] = await Promise.all([
    getAllItemsPaginated(itemsPage, { pinnedFirst: false }),
    getPaginatedCollections(collectionsPage),
  ]);

  const isEmpty = items.totalCount === 0 && collections.totalCount === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-sky-400">
          <Clock className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Recently Used</h1>
          <p className="text-xs text-muted-foreground">
            Your most recently updated items and collections
          </p>
        </div>
      </header>

      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Create an item or collection to see it here.
        </p>
      ) : (
        <>
          {items.totalCount > 0 && (
            <section>
              <SectionHeading icon={Clock} title="Recent Items" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
              <Pagination
                page={items.page}
                totalPages={items.totalPages}
                baseHref="/recent"
                pageParam="itemsPage"
                extraParams={
                  collections.page > 1
                    ? { collectionsPage: collections.page }
                    : undefined
                }
              />
            </section>
          )}

          {collections.totalCount > 0 && (
            <section>
              <SectionHeading icon={Folder} title="Recent Collections" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {collections.items.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
              <Pagination
                page={collections.page}
                totalPages={collections.totalPages}
                baseHref="/recent"
                pageParam="collectionsPage"
                extraParams={
                  items.page > 1 ? { itemsPage: items.page } : undefined
                }
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
