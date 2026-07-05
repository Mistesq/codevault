"use client";

import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardCollection } from "@/lib/db/collections";
import { useCollectionActions } from "./use-collection-actions";

/**
 * The 3-dots actions menu shown on a collection card. Edit and Delete open their
 * (controlled) dialogs; Favorite toggles the collection's favorite flag. The
 * trigger lives above the card's navigation overlay (z-index + a real button),
 * so opening the menu never navigates to the collection page.
 */
export function CollectionActions({
  collection,
  className,
}: {
  collection: DashboardCollection;
  className?: string;
}) {
  const router = useRouter();
  const { favorite, pending, toggle, openEdit, openDelete, dialogs } =
    useCollectionActions(collection, () => router.refresh());

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Collection actions"
              className={cn("text-muted-foreground", className)}
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={openEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={pending} onClick={toggle}>
            <Star className={cn(favorite && "fill-amber-400 text-amber-400")} />
            {favorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={openDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogs}
    </>
  );
}
