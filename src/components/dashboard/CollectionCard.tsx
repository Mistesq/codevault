import type { CSSProperties } from "react";
import Link from "next/link";
import { Folder, Star } from "lucide-react";

import type { DashboardCollection } from "@/lib/db/collections";
import { getTypeIcon } from "@/lib/type-icons";
import { CollectionActions } from "@/components/collections/CollectionActions";

export function CollectionCard({
  collection,
}: {
  collection: DashboardCollection;
}) {
  // Border accent is data-driven (most-used type color), so it's an inline style.
  const style: CSSProperties | undefined = collection.borderColor
    ? { borderColor: collection.borderColor }
    : undefined;

  // The card navigates to the collection page via a Link overlay (absolute,
  // covering the card) so clicking anywhere goes to the page — except the
  // actions menu, which sits above the overlay (z-index) and handles its own
  // clicks.
  return (
    <div
      style={style}
      className="group relative flex flex-col gap-2 rounded-xl border-l-2 border-border bg-card p-4 transition-colors hover:border-ring/40"
    >
      <Link
        href={`/collections/${collection.id}`}
        aria-label={`Open ${collection.name}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Folder className="size-4" />
        </span>
        <h3 className="truncate text-sm font-semibold">{collection.name}</h3>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {collection.isFavorite && (
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          )}
          <CollectionActions
            collection={collection}
            className="relative z-10 -mr-3.5"
          />
        </div>
      </div>

      {collection.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {collection.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          {collection.types.map((type) => {
            const Icon = getTypeIcon(type.icon);
            return (
              <Icon
                key={type.id}
                className="size-3.5 shrink-0"
                style={type.color ? { color: type.color } : undefined}
              />
            );
          })}
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}
