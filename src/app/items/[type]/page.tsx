import { notFound, redirect } from "next/navigation";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/pagination";
import { isProItemType } from "@/lib/billing/plan";
import { isFileType, isImageType } from "@/lib/item-content-types";
import { getItemsByTypeSlug } from "@/lib/db/items";
import { getSelectableCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/lib/db/user";
import { parsePageParam } from "@/lib/pagination";
import { TypeIcon, typeLabel } from "@/lib/type-icons";
import { pluralize } from "@/lib/utils";
import { CREATE_ITEM_TYPES, type CreateItemType } from "@/lib/validations/items";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

// Resolve a system ItemType.name to the matching create-dialog type, or null
// for types that can't be created here (File/Image — uploads are out of scope).
function toCreateType(name: string): CreateItemType | null {
  if (name === "URL") return "URL";
  const lower = name.toLowerCase();
  return (CREATE_ITEM_TYPES as readonly string[]).includes(lower)
    ? (lower as CreateItemType)
    : null;
}

export default async function ItemsByTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { type: slug } = await params;
  const page = parsePageParam((await searchParams).page);

  const [result, collections, user] = await Promise.all([
    getItemsByTypeSlug(slug, page),
    getSelectableCollections(),
    getSessionUser(),
  ]);
  if (!result) notFound();

  const { type, items, totalCount, totalPages } = result;

  // File & Image listings are Pro-only — send Free users to the upgrade page.
  if (isProItemType(type.name) && !user?.isPro) {
    redirect("/upgrade");
  }
  // Pluralize the capitalized type label: "snippet" -> "Snippets", "URL" -> "URLs".
  const heading = `${typeLabel(type.name)}s`;
  const createType = toCreateType(type.name);
  // Image items get a thumbnail gallery instead of the standard item cards.
  const showImageGallery = isImageType(type.name);
  // File items get a single-column list (Google Drive / Dropbox style).
  const showFileList = isFileType(type.name);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<TypeIcon name={type.icon} className="size-5" />}
        iconColor={type.color ?? undefined}
        title={heading}
        subtitle={pluralize(totalCount, "item")}
        actions={
          createType ? (
            <NewItemDialog
              collections={collections}
              defaultType={createType}
              triggerLabel={`New ${typeLabel(type.name)}`}
              isPro={!!user?.isPro}
            />
          ) : undefined
        }
      />

      {totalCount > 0 ? (
        <>
          {showFileList ? (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <FileRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) =>
                showImageGallery ? (
                  <ImageCard key={item.id} item={item} />
                ) : (
                  <ItemCard key={item.id} item={item} />
                ),
              )}
            </div>
          )}

          <Pagination
            page={result.page}
            totalPages={totalPages}
            baseHref={`/items/${slug}`}
          />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {heading.toLowerCase()} yet.
        </p>
      )}
    </div>
  );
}
