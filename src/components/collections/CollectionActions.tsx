"use client";

import { useState } from "react";
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
import { EditCollectionDialog } from "./EditCollectionDialog";
import { DeleteCollectionDialog } from "./DeleteCollectionDialog";

/**
 * The 3-dots actions menu shown on a collection card. Edit and Delete open their
 * (controlled) dialogs; Favorite is display-only for now. The trigger lives above
 * the card's navigation overlay (z-index + a real button), so opening the menu
 * never navigates to the collection page.
 */
export function CollectionActions({
  collection,
  className,
}: {
  collection: DashboardCollection;
  className?: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          {/* Favorite is display-only for now — no toggle behavior yet. */}
          <DropdownMenuItem>
            <Star />
            Favorite
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.refresh()}
      />
    </>
  );
}
