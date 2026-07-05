"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CollectionFormFields } from "@/components/collections/CollectionFormFields";
import { cn } from "@/lib/utils";
import { createCollection } from "@/actions/collections";

/**
 * "New Collection" button + modal dialog. Plain controlled inputs (no form
 * library); the server action's Zod schema is the source of truth. On success it
 * toasts, closes, resets, and refreshes so the dashboard cards and sidebar
 * counts pick up the new collection.
 */
export function NewCollectionDialog({
  compactOnMobile = false,
}: {
  // When true, the text label is hidden below `lg` (icon-only), used in the
  // space-constrained dashboard top bar (the md range shows the brand block).
  compactOnMobile?: boolean;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  // Only flag the name as invalid once the user has interacted with it, so it
  // isn't shown red while still pristine right after the dialog opens.
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameEmpty = name.trim().length === 0;
  const submitDisabled = nameEmpty || saving;

  function reset() {
    setName("");
    setNameTouched(false);
    setDescription("");
    setError(null);
    setSaving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    setSaving(true);
    setError(null);

    const result = await createCollection({
      name,
      description: description.trim() ? description : null,
    });

    if (!result.success) {
      // Inline error is shown directly above the actions; no duplicate toast.
      setError(result.error);
      setSaving(false);
      return;
    }

    toast.success("Collection created.");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="shrink-0"
            aria-label="New Collection"
          />
        }
      >
        <FolderPlus className="size-4" />
        <span className={cn(compactOnMobile && "hidden lg:inline")}>
          New Collection
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
          <DialogDescription>
            Group related items together — mixed item types are allowed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CollectionFormFields
            idPrefix="new-collection"
            name={name}
            onNameChange={(value) => {
              setName(value);
              setNameTouched(true);
            }}
            nameInvalid={nameTouched && nameEmpty}
            description={description}
            onDescriptionChange={setDescription}
            error={error}
            saving={saving}
            submitDisabled={submitDisabled}
            onCancel={() => setOpen(false)}
            submitLabel="Create Collection"
            savingLabel="Creating…"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
