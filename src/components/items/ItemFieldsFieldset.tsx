import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ItemContentField } from "@/components/items/ItemContentField";
import { LanguageSelect } from "@/components/items/LanguageSelect";
import { CollectionMultiSelect } from "@/components/items/CollectionMultiSelect";
import { SuggestTagsButton } from "@/components/items/SuggestTagsButton";
import { GenerateDescriptionButton } from "@/components/items/GenerateDescriptionButton";
import { addTag, parseTags } from "@/lib/item-form";
import type { SelectableCollection } from "@/lib/db/collections";

/**
 * The shared field block for the item create dialog and the drawer edit form:
 * Title, Description (+ AI Generate), Language, Content, URL, an optional file
 * slot, Tags (+ AI Suggest), and Collections. Both callers wrap this in their
 * own container (whose `space-y-*` spaces these blocks) and supply the type
 * selector / submit footer around it, so this returns a fragment.
 *
 * `idPrefix` namespaces the label/input ids (`new-item` vs `item`). The
 * `show*` flags mirror the item-content-types sets. `titleInvalid` lets each
 * caller decide when to flag the title (create waits for a touch, edit doesn't).
 */
export function ItemFieldsFieldset({
  idPrefix,
  isPro,
  typeLabelText,
  title,
  onTitleChange,
  titleInvalid,
  description,
  onDescriptionChange,
  language,
  onLanguageChange,
  showLanguage,
  content,
  onContentChange,
  showContent,
  isCodeContent,
  url,
  onUrlChange,
  showUrl,
  fileSlot,
  tags,
  onTagsChange,
  collections,
  collectionIds,
  onCollectionIdsChange,
}: {
  idPrefix: string;
  isPro: boolean;
  typeLabelText: string;
  title: string;
  onTitleChange: (value: string) => void;
  titleInvalid: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  showLanguage: boolean;
  content: string;
  onContentChange: (value: string) => void;
  showContent: boolean;
  isCodeContent: boolean;
  url: string;
  onUrlChange: (value: string) => void;
  showUrl: boolean;
  fileSlot?: ReactNode;
  tags: string;
  onTagsChange: Dispatch<SetStateAction<string>>;
  collections: SelectableCollection[];
  collectionIds: string[];
  onCollectionIdsChange: (ids: string[]) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-invalid={titleInvalid}
          placeholder="Give it a descriptive name"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          {isPro && (
            <GenerateDescriptionButton
              title={title}
              content={content}
              type={typeLabelText}
              url={url}
              language={language}
              onGenerate={onDescriptionChange}
            />
          )}
        </div>
        <Textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
        />
      </div>

      {showLanguage && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-language`}>Language</Label>
          <LanguageSelect
            id={`${idPrefix}-language`}
            value={language}
            onChange={onLanguageChange}
          />
        </div>
      )}

      {showContent && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-content`}>Content</Label>
          <ItemContentField
            isCode={isCodeContent}
            value={content}
            onChange={onContentChange}
            language={language}
          />
        </div>
      )}

      {showUrl && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-url`}>URL</Label>
          {/* Plain text input so the server-side Zod check is the source of
              truth and its error renders inline, rather than the browser's
              native type="url" validation short-circuiting submit. */}
          <Input
            id={`${idPrefix}-url`}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      )}

      {fileSlot}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tags`}>Tags</Label>
        <Input
          id={`${idPrefix}-tags`}
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="Comma-separated, e.g. react, hooks"
        />
        {isPro && (
          <SuggestTagsButton
            title={title}
            content={content}
            currentTags={parseTags(tags)}
            onAdd={(tag) => onTagsChange((prev) => addTag(prev, tag))}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Collections</Label>
        <CollectionMultiSelect
          collections={collections}
          selectedIds={collectionIds}
          onChange={onCollectionIdsChange}
        />
      </div>
    </>
  );
}
