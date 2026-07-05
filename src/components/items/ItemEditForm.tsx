"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItemFieldsFieldset } from "@/components/items/ItemFieldsFieldset";
import { typeLabel } from "@/lib/type-icons";
import { updateItem } from "@/actions/items";
import {
  CODE_CONTENT_TYPES,
  CONTENT_FIELD_TYPES,
  LANGUAGE_FIELD_TYPES,
} from "@/lib/item-content-types";
import { buildItemFields } from "@/lib/item-form";
import type { ItemDetail } from "@/lib/db/items";
import type { SelectableCollection } from "@/lib/db/collections";

// URL is the only field-visibility rule unique to this form (the create dialog
// keys off its "URL" CreateItemType instead); content/language come from the
// shared item-content-types sets.
const URL_TYPES = new Set(["url"]);

/**
 * Inline edit form for the item drawer. Plain controlled inputs (no form
 * library); the server action's Zod schema is the source of truth. On success
 * it hands the refreshed detail back via onSaved and calls router.refresh() so
 * the underlying card grid reflects the change.
 */
export function ItemEditForm({
  detail,
  collections,
  isPro = false,
  onCancel,
  onSaved,
}: {
  detail: ItemDetail;
  collections: SelectableCollection[];
  // Gates the AI "Suggest Tags" affordance (Pro-only); server-side re-checks.
  isPro?: boolean;
  onCancel: () => void;
  onSaved: (updated: ItemDetail) => void;
}) {
  const router = useRouter();
  const typeName = detail.type.name.toLowerCase();
  const showContent = CONTENT_FIELD_TYPES.has(typeName);
  const isCodeContent = CODE_CONTENT_TYPES.has(typeName);
  const showLanguage = LANGUAGE_FIELD_TYPES.has(typeName);
  const showUrl = URL_TYPES.has(typeName);

  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [content, setContent] = useState(detail.content ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [tags, setTags] = useState(detail.tags.join(", "));
  const [collectionIds, setCollectionIds] = useState<string[]>(
    detail.collections.map((c) => c.id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleEmpty = title.trim().length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (titleEmpty || saving) return;

    setSaving(true);
    setError(null);

    const payload = buildItemFields({
      title,
      description,
      content,
      language,
      url,
      tags,
      showContent,
      showLanguage,
      showUrl,
    });

    const result = await updateItem(detail.id, { ...payload, collectionIds });

    if (!result.success) {
      // Inline error is shown directly above the actions; no duplicate toast.
      setError(result.error);
      setSaving(false);
      return;
    }

    toast.success("Item updated.");
    router.refresh();
    onSaved(result.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="drawer-scroll flex-1 space-y-4 overflow-y-auto p-4">
        <ItemFieldsFieldset
          idPrefix="item"
          isPro={isPro}
          typeLabelText={typeLabel(detail.type.name)}
          title={title}
          onTitleChange={setTitle}
          titleInvalid={titleEmpty}
          description={description}
          onDescriptionChange={setDescription}
          language={language}
          onLanguageChange={setLanguage}
          showLanguage={showLanguage}
          content={content}
          onContentChange={setContent}
          showContent={showContent}
          isCodeContent={isCodeContent}
          url={url}
          onUrlChange={setUrl}
          showUrl={showUrl}
          tags={tags}
          onTagsChange={setTags}
          collections={collections}
          collectionIds={collectionIds}
          onCollectionIdsChange={setCollectionIds}
        />

        {/* Type and dates aren't editable here (collections now are, above). */}
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Item type and dates aren&apos;t editable here.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-row gap-2 border-t border-border p-4">
        <Button
          type="submit"
          variant="default"
          size="default"
          disabled={titleEmpty || saving}
          className="flex-1"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
