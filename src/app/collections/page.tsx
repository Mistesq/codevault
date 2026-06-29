import { FolderOpen } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { Pagination } from "@/components/ui/pagination";
import { getPaginatedCollections } from "@/lib/db/collections";
import { parsePageParam } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePageParam((await searchParams).page);
  const { items: collections, totalCount, totalPages, page: current } =
    await getPaginatedCollections(page);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FolderOpen className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Collections</h1>
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "collection" : "collections"}
          </p>
        </div>
        <div className="ml-auto">
          <NewCollectionDialog />
        </div>
      </header>

      {totalCount > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>

          <Pagination
            page={current}
            totalPages={totalPages}
            baseHref="/collections"
          />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No collections yet.
        </p>
      )}
    </div>
  );
}
