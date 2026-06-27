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
import { TypeIcon, typeLabel } from "@/lib/type-icons";
import { createItem } from "@/actions/items";
import type { CreateItemType } from "@/lib/validations/items";

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
];

// Which type-specific fields each selectable type exposes (mirrors ItemEditForm).
const CONTENT_TYPES = new Set<CreateItemType>([
  "snippet",
  "prompt",
  "command",
  "note",
]);
const LANGUAGE_TYPES = new Set<CreateItemType>(["snippet", "command"]);

const DEFAULT_TYPE: CreateItemType = "snippet";

/**
 * "New Item" button + modal dialog for creating an item. Plain controlled
 * inputs (no form library); the server action's Zod schema is the source of
 * truth. Fields shown depend on the selected type. On success it toasts, closes,
 * resets, and refreshes so the grids and sidebar counts update.
 */
export function NewItemDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<CreateItemType>(DEFAULT_TYPE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showContent = CONTENT_TYPES.has(type);
  const showLanguage = LANGUAGE_TYPES.has(type);
  const showUrl = type === "URL";
  const titleEmpty = title.trim().length === 0;

  function reset() {
    setType(DEFAULT_TYPE);
    setTitle("");
    setDescription("");
    setContent("");
    setLanguage("");
    setUrl("");
    setTags("");
    setError(null);
    setSaving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (titleEmpty || saving) return;

    setSaving(true);
    setError(null);

    const payload = {
      type,
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

    const result = await createItem(payload);

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
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
      <DialogTrigger render={<Button className="shrink-0" />}>
        <Plus className="size-4" />
        New Item
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>
            Add a snippet, prompt, command, note, or link to your vault.
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
                    onClick={() => setType(opt.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-2.5 text-xs font-medium transition-colors",
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
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={titleEmpty}
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

          {showContent && (
            <div className="space-y-1.5">
              <Label htmlFor="new-item-content">Content</Label>
              <Textarea
                id="new-item-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          )}

          {showLanguage && (
            <div className="space-y-1.5">
              <Label htmlFor="new-item-language">Language</Label>
              <Input
                id="new-item-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. tsx, bash"
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

          <div className="space-y-1.5">
            <Label htmlFor="new-item-tags">Tags</Label>
            <Input
              id="new-item-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated, e.g. react, hooks"
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
            <Button type="submit" disabled={titleEmpty || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Creating…" : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
