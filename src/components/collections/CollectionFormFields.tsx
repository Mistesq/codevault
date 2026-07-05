import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The shared body of the New/Edit Collection dialogs: Name + Description inputs,
 * an inline error line, and the Cancel/Submit footer. Both callers wrap this in
 * their own `<form onSubmit>` (whose `space-y-4` spaces these blocks) and own the
 * state; this stays presentational.
 *
 * `idPrefix` namespaces the label/input ids (`new-collection` vs
 * `edit-collection`); `submitLabel`/`savingLabel` differ per action.
 */
export function CollectionFormFields({
  idPrefix,
  name,
  onNameChange,
  nameInvalid,
  description,
  onDescriptionChange,
  error,
  saving,
  submitDisabled,
  onCancel,
  submitLabel,
  savingLabel,
}: {
  idPrefix: string;
  name: string;
  onNameChange: (value: string) => void;
  nameInvalid: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  error: string | null;
  saving: boolean;
  submitDisabled: boolean;
  onCancel: () => void;
  submitLabel: string;
  savingLabel: string;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-invalid={nameInvalid}
          placeholder="e.g. React Patterns"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What's this collection for?"
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-row justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? savingLabel : submitLabel}
        </Button>
      </div>
    </>
  );
}
