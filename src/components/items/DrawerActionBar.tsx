import { Pencil, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/items/CopyButton";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { useFavoriteToggle } from "@/components/favorites/use-favorite-toggle";
import { usePinToggle } from "@/components/items/use-pin-toggle";
import type { DashboardItem, ItemDetail } from "@/lib/db/items";
import { cn } from "@/lib/utils";

/**
 * The drawer's view-mode action bar: Copy is wired; Favorite toggles the item's
 * favorite flag; Pin toggles the item's pinned flag (pinned items sort to the
 * top of listings and show in the dashboard's pinned section); Edit flips the
 * drawer into edit mode (disabled until detail loads); Delete is the
 * confirmation dialog.
 */
export function DrawerActionBar({
  item,
  detail,
  copyText,
  onEdit,
  onDeleted,
}: {
  item: DashboardItem;
  detail: ItemDetail | null;
  copyText: string;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { favorite, pending, toggle } = useFavoriteToggle(
    "item",
    item.id,
    item.isFavorite,
  );
  const {
    pinned,
    pending: pinPending,
    toggle: togglePin,
  } = usePinToggle(item.id, item.isPinned);

  return (
    <div className="flex items-center gap-1">
      <CopyButton text={copyText} />
      <Button
        type="button"
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
            favorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground",
          )}
        />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={pinned ? "Unpin" : "Pin"}
        aria-pressed={pinned}
        disabled={pinPending}
        onClick={togglePin}
      >
        <Pin
          className={cn(
            "size-4",
            pinned
              ? "fill-foreground text-foreground"
              : "text-muted-foreground",
          )}
        />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Edit"
        disabled={!detail}
        onClick={onEdit}
      >
        <Pencil className="size-4 text-muted-foreground" />
      </Button>
      <DeleteItemDialog
        itemId={item.id}
        title={item.title}
        onDeleted={onDeleted}
      />
    </div>
  );
}
