"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectionFormFields } from "@/components/collections/CollectionFormFields";
import { updateCollection } from "@/actions/collections";

/** Minimal collection shape the edit form needs. */
interface EditableCollection {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Controlled Edit Collection modal (open state owned by the caller, since it's
 * triggered from a dropdown / header button rather than its own trigger). Mirrors
 * NewCollectionDialog's metadata fields; the server action's Zod schema is the
 * source of truth. On success it toasts, closes, and refreshes so the card grids
 * and detail header pick up the change.
 */
export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
}: {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const [name, setName] = useState(collection.name);
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState(collection.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameEmpty = name.trim().length === 0;
  const submitDisabled = nameEmpty || saving;

  // Re-sync the form to the current collection whenever the dialog opens, so a
  // reused component instance never shows a previous edit's values.
  function handleOpenChange(next: boolean) {
    if (next) {
      setName(collection.name);
      setNameTouched(false);
      setDescription(collection.description ?? "");
      setError(null);
      setSaving(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    setSaving(true);
    setError(null);

    const result = await updateCollection(collection.id, {
      name,
      description: description.trim() ? description : null,
    });

    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }

    toast.success("Collection updated.");
    onOpenChange(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Collection</DialogTitle>
          <DialogDescription>
            Update the collection&apos;s name and description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CollectionFormFields
            idPrefix="edit-collection"
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
            onCancel={() => onOpenChange(false)}
            submitLabel="Save Changes"
            savingLabel="Saving…"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
