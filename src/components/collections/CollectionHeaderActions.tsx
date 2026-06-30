"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFavoriteToggle } from "@/components/favorites/use-favorite-toggle";
import { EditCollectionDialog } from "./EditCollectionDialog";
import { DeleteCollectionDialog } from "./DeleteCollectionDialog";

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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { favorite, pending, toggle } = useFavoriteToggle(
    "collection",
    collection.id,
    collection.isFavorite,
  );

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
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete collection"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/collections")}
      />
    </div>
  );
}
