"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { updateItem } from "@/actions/items";
import type { ItemDetail } from "@/lib/db/items";

// Which type-specific fields each system item type exposes in edit mode.
const CONTENT_TYPES = new Set(["snippet", "prompt", "command", "note"]);
// Code types get the Monaco-based CodeEditor; the rest keep the plain Textarea.
const CODE_CONTENT_TYPES = new Set(["snippet", "command"]);
const LANGUAGE_TYPES = new Set(["snippet", "command"]);
const URL_TYPES = new Set(["url"]);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Inline edit form for the item drawer. Plain controlled inputs (no form
 * library); the server action's Zod schema is the source of truth. On success
 * it hands the refreshed detail back via onSaved and calls router.refresh() so
 * the underlying card grid reflects the change.
 */
export function ItemEditForm({
  detail,
  onCancel,
  onSaved,
}: {
  detail: ItemDetail;
  onCancel: () => void;
  onSaved: (updated: ItemDetail) => void;
}) {
  const router = useRouter();
  const typeName = detail.type.name.toLowerCase();
  const showContent = CONTENT_TYPES.has(typeName);
  const isCodeContent = CODE_CONTENT_TYPES.has(typeName);
  const showLanguage = LANGUAGE_TYPES.has(typeName);
  const showUrl = URL_TYPES.has(typeName);

  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [content, setContent] = useState(detail.content ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [tags, setTags] = useState(detail.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleEmpty = title.trim().length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (titleEmpty || saving) return;

    setSaving(true);
    setError(null);

    const payload = {
      title,
      description,
      content: showContent ? content : null,
      language: showLanguage ? language : null,
      url: showUrl ? url : null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const result = await updateItem(detail.id, payload);

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
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
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label htmlFor="item-title">Title</Label>
          <Input
            id="item-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={titleEmpty}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="item-description">Description</Label>
          <Textarea
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {showContent && (
          <div className="space-y-1.5">
            <Label htmlFor="item-content">Content</Label>
            {isCodeContent ? (
              <CodeEditor
                value={content}
                onChange={setContent}
                language={language}
              />
            ) : (
              // Notes & prompts get the Markdown editor (Write/Preview).
              <MarkdownEditor value={content} onChange={setContent} />
            )}
          </div>
        )}

        {showLanguage && (
          <div className="space-y-1.5">
            <Label htmlFor="item-language">Language</Label>
            <Input
              id="item-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. tsx, bash"
            />
          </div>
        )}

        {showUrl && (
          <div className="space-y-1.5">
            <Label htmlFor="item-url">URL</Label>
            {/* Plain text input (per spec) so the server-side Zod check is the
                source of truth and its error renders inline, rather than the
                browser's native type="url" validation short-circuiting submit. */}
            <Input
              id="item-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="item-tags">Tags</Label>
          <Input
            id="item-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma-separated, e.g. react, hooks"
          />
        </div>

        {/* Display-only context per spec — type/collection/dates aren't editable. */}
        <div className="space-y-2 border-t border-border pt-4">
          {detail.collection && (
            <div className="flex items-center justify-between gap-2">
              <SectionLabel>Collection</SectionLabel>
              <p className="text-sm text-foreground">{detail.collection.name}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Type, collection, and dates aren&apos;t editable here.
          </p>
        </div>

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
