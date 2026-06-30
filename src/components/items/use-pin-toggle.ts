"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setItemPinned } from "@/actions/items";

/**
 * Shared pin-toggle behavior for the Pin control in the item drawer. Mirrors
 * useFavoriteToggle: optimistically flips local state, calls the server action,
 * then refreshes so server-rendered listings (where pinned items sort to the
 * top) and the dashboard's pinned section stay in sync. Reverts + toasts on
 * failure.
 *
 * Re-syncs to `initial` when `id` changes so the control reflects the
 * newly-opened item when the drawer is reused across rows.
 */
export function usePinToggle(id: string, initial: boolean) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Adjust state during render (React's recommended pattern) when the target
  // changes, rather than in an effect.
  const [lastId, setLastId] = useState(id);
  if (id !== lastId) {
    setLastId(id);
    setPinned(initial);
  }

  function toggle() {
    const next = !pinned;
    setPinned(next); // optimistic

    startTransition(async () => {
      const result = await setItemPinned(id, next);

      if (!result.success) {
        setPinned(!next); // revert
        toast.error(result.error);
        return;
      }

      toast.success(next ? "Item pinned" : "Item unpinned");
      router.refresh();
    });
  }

  return { pinned, pending, toggle };
}
