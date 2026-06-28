import { Pencil, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/items/CopyButton";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import type { DashboardItem, ItemDetail } from "@/lib/db/items";
import { cn } from "@/lib/utils";

/**
 * The drawer's view-mode action bar: Copy is wired; Favorite/Pin reflect state
 * but are display-only until those mutations land; Edit flips the drawer into
 * edit mode (disabled until detail loads); Delete is the confirmation dialog.
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
  return (
    <div className="flex items-center gap-1">
      <CopyButton text={copyText} />
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Favorite">
        <Star
          className={cn(
            "size-4",
            item.isFavorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground",
          )}
        />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Pin">
        <Pin
          className={cn(
            "size-4",
            item.isPinned ? "text-foreground" : "text-muted-foreground",
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
