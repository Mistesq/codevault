import { notFound } from "next/navigation";
import { Folder, Star } from "lucide-react";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { CollectionHeaderActions } from "@/components/collections/CollectionHeaderActions";
import { Pagination } from "@/components/ui/pagination";
import { getCollectionWithItems } from "@/lib/db/collections";
import type { DashboardItem } from "@/lib/db/items";
import { parsePageParam } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

const isImage = (item: DashboardItem) => item.type.name.toLowerCase() === "image";
const isFile = (item: DashboardItem) => item.type.name.toLowerCase() === "file";

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const page = parsePageParam((await searchParams).page);

  const collection = await getCollectionWithItems(id, page);
  if (!collection) notFound();

  const { items, totalCount, totalPages } = collection;
  // Mixed-type collections render in sections, mirroring how each type renders
  // on /items/[type]: standard cards first, then an image gallery, then a file
  // list. All cards open the shared item drawer.
  const cardItems = items.filter((i) => !isImage(i) && !isFile(i));
  const imageItems = items.filter(isImage);
  const fileItems = items.filter(isFile);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Folder className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{collection.name}</h1>
            {collection.isFavorite && (
              <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          {collection.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </p>
        </div>
        <CollectionHeaderActions
          collection={{
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isFavorite: collection.isFavorite,
          }}
        />
      </header>

      {totalCount === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          This collection has no items yet.
        </p>
      ) : (
        <>
          {cardItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cardItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {imageItems.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Images</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {imageItems.map((item) => (
                  <ImageCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {fileItems.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Files</h2>
              <div className="flex flex-col gap-2">
                {fileItems.map((item) => (
                  <FileRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          <Pagination
            page={collection.page}
            totalPages={totalPages}
            baseHref={`/collections/${id}`}
          />
        </>
      )}
    </div>
  );
}
