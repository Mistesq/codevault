import Link from "next/link";
import { Folder, Star } from "lucide-react";

import type { Collection } from "@/lib/mock-data";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/40"
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
      <p className="mt-auto text-xs text-muted-foreground">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </p>
    </Link>
  );
}
