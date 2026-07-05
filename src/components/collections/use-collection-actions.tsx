"use client";

import { useState } from "react";

import { useFavoriteToggle } from "@/components/favorites/use-favorite-toggle";
import { EditCollectionDialog } from "./EditCollectionDialog";
import { DeleteCollectionDialog } from "./DeleteCollectionDialog";

interface ActionableCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

/**
 * Shared wiring for a collection's Edit / Delete / Favorite controls, used by
 * both the card dropdown ({@link CollectionActions}) and the detail-header
 * buttons ({@link CollectionHeaderActions}). It owns the dialog open state and
 * the favorite toggle, and renders the (identical) Edit/Delete dialog pair —
 * each caller supplies only its own trigger markup and the `onDeleted` behavior
 * (refresh a grid vs. redirect away from the deleted page).
 */
export function useCollectionActions(
  collection: ActionableCollection,
  onDeleted: () => void,
) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { favorite, pending, toggle } = useFavoriteToggle(
    "collection",
    collection.id,
    collection.isFavorite,
  );

  const dialogs = (
    <>
      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  );

  return {
    favorite,
    pending,
    toggle,
    openEdit: () => setEditOpen(true),
    openDelete: () => setDeleteOpen(true),
    dialogs,
  };
}
