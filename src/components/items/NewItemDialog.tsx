"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { ItemContentField } from "@/components/items/ItemContentField";
import { LanguageSelect } from "@/components/items/LanguageSelect";
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload";
import { CollectionMultiSelect } from "@/components/items/CollectionMultiSelect";
import { TypeIcon, typeLabel } from "@/lib/type-icons";
import {
  CODE_CONTENT_TYPES,
  CONTENT_FIELD_TYPES,
  FILE_FIELD_TYPES,
  LANGUAGE_FIELD_TYPES,
} from "@/lib/item-content-types";
import { buildItemFields } from "@/lib/item-form";
import { createItem } from "@/actions/items";
import type { CreateItemType } from "@/lib/validations/items";
import type { SelectableCollection } from "@/lib/db/collections";

// Type selector options. `icon` matches the lucide names on the seeded system
// types; `color` mirrors each system type's seeded color; `label` is the display
// name ("URL" → "Link" to match the spec).
const TYPE_OPTIONS: {
  value: CreateItemType;
  icon: string;
  color: string;
  label: string;
}[] = [
  { value: "snippet", icon: "Code", color: "#3b82f6", label: typeLabel("snippet") },
  { value: "prompt", icon: "Sparkles", color: "#8b5cf6", label: typeLabel("prompt") },
  { value: "command", icon: "Terminal", color: "#f97316", label: typeLabel("command") },
  { value: "note", icon: "StickyNote", color: "#fde047", label: typeLabel("note") },
  { value: "URL", icon: "Link", color: "#10b981", label: "Link" },
  { value: "file", icon: "File", color: "#6b7280", label: typeLabel("file") },
  { value: "image", icon: "Image", color: "#ec4899", label: typeLabel("image") },
];

const DEFAULT_TYPE: CreateItemType = "snippet";

/**
 * "New Item" button + modal dialog for creating an item. Plain controlled
 * inputs (no form library); the server action's Zod schema is the source of
 * truth. Fields shown depend on the selected type. On success it toasts, closes,
 * resets, and refreshes so the grids and sidebar counts update.
 *
 * `defaultType` preselects the type (e.g. the per-type pages pass their own
 * type); `triggerLabel` customizes the button text.
 */
export function NewItemDialog({
  collections = [],
  defaultType = DEFAULT_TYPE,
  triggerLabel = "New Item",
  compactOnMobile = false,
}: {
  collections?: SelectableCollection[];
  defaultType?: CreateItemType;
  triggerLabel?: string;
  // When true, the text label is hidden below `lg` (icon-only), used in the
  // space-constrained dashboard top bar (the md range shows the brand block).
  compactOnMobile?: boolean;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<CreateItemType>(defaultType);
  const [title, setTitle] = useState("");
  // Only flag the title as invalid once the user has interacted with it, so it
  // isn't shown red while still pristine right after the dialog opens.
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showContent = CONTENT_FIELD_TYPES.has(type);
  const isCodeContent = CODE_CONTENT_TYPES.has(type);
  const showLanguage = LANGUAGE_FIELD_TYPES.has(type);
  const showUrl = type === "URL";
  const showFile = FILE_FIELD_TYPES.has(type);
  const titleEmpty = title.trim().length === 0;
  // File/image items can't be created until their upload has finished.
  const fileMissing = showFile && !file;
  const submitDisabled = titleEmpty || saving || uploading || fileMissing;

  function reset() {
    setType(defaultType);
    setTitle("");
    setTitleTouched(false);
    setDescription("");
    setContent("");
    setLanguage("");
    setUrl("");
    setTags("");
    setCollectionIds([]);
    setFile(null);
    setUploading(false);
    setError(null);
    setSaving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    setSaving(true);
    setError(null);

    const payload = {
      type,
      ...buildItemFields({
        title,
        description,
        content,
        language,
        url,
        tags,
        showContent,
        showLanguage,
        showUrl,
      }),
      collectionIds,
      fileUrl: showFile ? file?.fileUrl ?? null : null,
      fileName: showFile ? file?.fileName ?? null : null,
      fileSize: showFile ? file?.fileSize ?? null : null,
    };

    const result = await createItem(payload);

    if (!result.success) {
      // Inline error is shown directly above the actions; no duplicate toast.
      setError(result.error);
      setSaving(false);
      return;
    }

    toast.success("Item created.");
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
        render={<Button className="shrink-0" aria-label={triggerLabel} />}
      >
        <Plus className="size-4" />
        <span className={cn(compactOnMobile && "hidden lg:inline")}>
          {triggerLabel}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>
            Add a snippet, prompt, command, note, link, file, or image to your
            vault.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TYPE_OPTIONS.map((opt) => {
                const selected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setType(opt.value);
                      // Clear any staged upload when leaving a file/image type.
                      if (!FILE_FIELD_TYPES.has(opt.value)) setFile(null);
                      setError(null);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border p-2.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <TypeIcon
                      name={opt.icon}
                      className="size-4"
                      style={{ color: opt.color }}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-item-title">Title</Label>
            <Input
              id="new-item-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              aria-invalid={titleTouched && titleEmpty}
              placeholder="Give it a descriptive name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-item-description">Description</Label>
            <Textarea
              id="new-item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {showLanguage && (
            <div className="space-y-1.5">
              <Label htmlFor="new-item-language">Language</Label>
              <LanguageSelect
                id="new-item-language"
                value={language}
                onChange={setLanguage}
              />
            </div>
          )}

          {showContent && (
            <div className="space-y-1.5">
              <Label htmlFor="new-item-content">Content</Label>
              <ItemContentField
                isCode={isCodeContent}
                value={content}
                onChange={setContent}
                language={language}
              />
            </div>
          )}

          {showUrl && (
            <div className="space-y-1.5">
              <Label htmlFor="new-item-url">URL</Label>
              {/* Plain text input (matching ItemEditForm) so the server-side Zod
                  check is the source of truth and its error renders inline. */}
              <Input
                id="new-item-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          )}

          {showFile && (
            <div className="space-y-1.5">
              <Label>{type === "image" ? "Image" : "File"}</Label>
              <FileUpload
                kind={type === "image" ? "image" : "file"}
                value={file}
                onChange={setFile}
                onUploadingChange={setUploading}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-item-tags">Tags</Label>
            <Input
              id="new-item-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated, e.g. react, hooks"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Collections</Label>
            <CollectionMultiSelect
              collections={collections}
              selectedIds={collectionIds}
              onChange={setCollectionIds}
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
              {saving ? "Creating…" : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
