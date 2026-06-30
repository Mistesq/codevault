"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setItemFavorite } from "@/actions/items";
import { setCollectionFavorite } from "@/actions/collections";

type FavoriteKind = "item" | "collection";

/**
 * Shared favorite-toggle behavior for the Star controls on item/collection cards,
 * the item drawer, and the collection header. Optimistically flips local state,
 * calls the matching server action, then refreshes so server-rendered grids (and
 * the /favorites page) stay in sync. Reverts + toasts on failure.
 *
 * Re-syncs to `initial` when `id` changes so a control reused across rows (e.g.
 * the drawer's action bar) reflects the newly-opened target.
 */
export function useFavoriteToggle(
  kind: FavoriteKind,
  id: string,
  initial: boolean,
) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Adjust state during render (React's recommended pattern) when the target
  // changes, rather than in an effect.
  const [lastId, setLastId] = useState(id);
  if (id !== lastId) {
    setLastId(id);
    setFavorite(initial);
  }

  function toggle() {
    const next = !favorite;
    setFavorite(next); // optimistic

    startTransition(async () => {
      const action = kind === "item" ? setItemFavorite : setCollectionFavorite;
      const result = await action(id, next);

      if (!result.success) {
        setFavorite(!next); // revert
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  return { favorite, pending, toggle };
}
