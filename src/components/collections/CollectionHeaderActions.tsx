"use client";

import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCollectionActions } from "./use-collection-actions";

/** Minimal collection shape the header controls need. */
interface HeaderCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

/**
 * Favorite / Edit / Delete controls for the collection detail header. Favorite
 * toggles the collection's favorite flag. Deleting redirects back to
 * /collections, since the page it lived on no longer exists.
 */
export function CollectionHeaderActions({
  collection,
}: {
  collection: HeaderCollection;
}) {
  const router = useRouter();
  const { favorite, pending, toggle, openEdit, openDelete, dialogs } =
    useCollectionActions(collection, () => router.push("/collections"));

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={favorite ? "Remove favorite" : "Favorite"}
        aria-pressed={favorite}
        disabled={pending}
        onClick={toggle}
      >
        <Star
          className={cn(
            "size-4",
            favorite && "fill-amber-400 text-amber-400",
          )}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Edit collection"
        onClick={openEdit}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete collection"
        onClick={openDelete}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>

      {dialogs}
    </div>
  );
}
