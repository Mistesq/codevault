"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteItem } from "@/actions/items";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteFooter } from "@/components/ui/confirm-delete-footer";

/**
 * Trash action in the drawer's action bar, gated behind a shadcn confirmation.
 * On confirm it deletes the item, shows a success toast, refreshes the card
 * grids, and calls `onDeleted` (the drawer closes). On failure it keeps the
 * dialog/drawer open and surfaces an error toast.
 */
export function DeleteItemDialog({
  itemId,
  title,
  onDeleted,
}: {
  itemId: string;
  title: string;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await deleteItem(itemId);
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    toast.success("Item deleted.");
    router.refresh();
    onDeleted();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            className="ml-auto"
          />
        }
      >
        <Trash2 className="size-4 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete item</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-medium text-foreground">{title}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ConfirmDeleteFooter
          pending={pending}
          confirmLabel="Delete"
          onConfirm={handleDelete}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
