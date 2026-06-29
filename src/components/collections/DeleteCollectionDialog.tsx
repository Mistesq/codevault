"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { deleteCollection } from "@/actions/collections";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Controlled delete-confirmation dialog (open state owned by the caller). On
 * confirm it deletes the collection — items are kept, only the collection and its
 * membership rows go away — toasts, then hands control back via `onDeleted` so
 * the caller can refresh a grid or redirect away from the now-gone page.
 */
export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  onDeleted,
}: {
  collection: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await deleteCollection(collection.id);
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    onOpenChange(false);
    toast.success("Collection deleted.");
    onDeleted();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete collection</AlertDialogTitle>
          <AlertDialogDescription>
            Delete{" "}
            <span className="font-medium text-foreground">
              {collection.name}
            </span>
            ? The items inside stay in your vault — only the collection is
            removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
