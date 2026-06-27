import type { CSSProperties } from "react";
import Link from "next/link";
import { Folder, Star } from "lucide-react";

import type { DashboardCollection } from "@/lib/db/collections";
import { getTypeIcon } from "@/lib/type-icons";

export function CollectionCard({
  collection,
}: {
  collection: DashboardCollection;
}) {
  // Border accent is data-driven (most-used type color), so it's an inline style.
  const style: CSSProperties | undefined = collection.borderColor
    ? { borderColor: collection.borderColor }
    : undefined;

  return (
    <Link
      href={`/collections/${collection.id}`}
      style={style}
      className="flex flex-col gap-2 rounded-xl border-l-2 border-border bg-card p-4 transition-colors hover:border-ring/40"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Folder className="size-4" />
        </span>
        <h3 className="truncate text-sm font-semibold">{collection.name}</h3>
        {collection.isFavorite && (
          <Star className="ml-auto size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
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
    </Link>
  );
}
