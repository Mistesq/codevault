"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  // When true, the text label is hidden below `sm` (icon-only), used in the
  // space-constrained dashboard top bar.
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
        <span className={cn(compactOnMobile && "hidden sm:inline")}>
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
          <div className="space-y-1.5">
            <Label htmlFor="new-collection-name">Name</Label>
            <Input
              id="new-collection-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              aria-invalid={nameTouched && nameEmpty}
              placeholder="e.g. React Patterns"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-collection-description">Description</Label>
            <Textarea
              id="new-collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection for?"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Creating…" : "Create Collection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
