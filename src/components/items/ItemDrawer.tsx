"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Pencil, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { formatFileSize, relativeTime } from "@/lib/dashboard-data";
import type { DashboardItem, ItemDetail } from "@/lib/db/items";
import { TypeIcon, typeLabel } from "@/lib/type-icons";
import { cn } from "@/lib/utils";

// Code item types render their content in the read-only CodeEditor; notes &
// prompts render in the read-only Markdown preview; other types (url/file) keep
// the plain block in ContentBody.
const CODE_CONTENT_TYPES = new Set(["snippet", "command"]);
const MARKDOWN_CONTENT_TYPES = new Set(["note", "prompt"]);

/** The text the Copy actions place on the clipboard for a given item. */
function copyableText(detail: ItemDetail): string {
  if (detail.contentType === "FILE") return detail.fileName ?? "";
  if (detail.url) return detail.url;
  return detail.content ?? "";
}

/** Small button that copies text and briefly flips to a check. */
function CopyButton({
  text,
  variant = "ghost",
  size = "icon-sm",
  label = "Copy",
  withLabel = false,
  className,
}: {
  text: string;
  variant?: "ghost" | "outline" | "default";
  size?: "icon-sm" | "sm" | "default";
  label?: string;
  withLabel?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can reject (e.g. insecure context); silently ignore.
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={label}
      className={className}
    >
      <Icon className={cn("size-4", copied && "text-emerald-500")} />
      {withLabel && <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}

/** Rendered content body for a loaded item (text / url / file). */
function ContentBody({ detail }: { detail: ItemDetail }) {
  if (detail.contentType === "FILE" && detail.fileName) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        {detail.fileName}
        {detail.fileSize != null && ` · ${formatFileSize(detail.fileSize)}`}
      </p>
    );
  }

  if (detail.url) {
    return (
      <a
        href={detail.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 break-all font-mono text-sm text-primary hover:underline"
      >
        <ExternalLink className="size-3.5 shrink-0" />
        {detail.url}
      </a>
    );
  }

  if (detail.content) {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm text-muted-foreground">
        {detail.content}
      </pre>
    );
  }

  return <p className="text-sm text-muted-foreground">No content.</p>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function ItemDrawer({
  open,
  onOpenChange,
  item,
  detail,
  loading,
  error,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DashboardItem | null;
  detail: ItemDetail | null;
  loading: boolean;
  error: boolean;
  onUpdated: (detail: ItemDetail) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);

  // Reset edit mode when a different item is opened — adjust state during render
  // (React's recommended pattern) rather than in an effect.
  const [lastItemId, setLastItemId] = useState(item?.id ?? null);
  if ((item?.id ?? null) !== lastItemId) {
    setLastItemId(item?.id ?? null);
    setEditing(false);
  }

  // Also drop out of edit mode whenever the drawer closes (X / esc / overlay).
  function handleOpenChange(next: boolean) {
    if (!next) setEditing(false);
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        {item && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-4 pr-12">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted"
                  style={item.type.color ? { color: item.type.color } : undefined}
                >
                  <TypeIcon name={item.type.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {editing ? `Edit ${typeLabel(item.type.name)}` : typeLabel(item.type.name)}
                  </p>
                  <SheetTitle className="truncate text-base font-semibold">
                    {item.title}
                  </SheetTitle>
                </div>
              </div>

              {/* Action bar — replaced by the edit form's Save/Cancel when
                  editing. Copy is wired; favorite/pin/delete land with the rest
                  of item CRUD later, so they're display-only for now. */}
              {!editing && (
                <div className="flex items-center gap-1">
                  <CopyButton text={detail ? copyableText(detail) : ""} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Favorite"
                  >
                    <Star
                      className={cn(
                        "size-4",
                        item.isFavorite
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Pin"
                  >
                    <Pin
                      className={cn(
                        "size-4",
                        item.isPinned
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit"
                    disabled={!detail}
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <DeleteItemDialog
                    itemId={item.id}
                    title={item.title}
                    onDeleted={onDeleted}
                  />
                </div>
              )}
            </SheetHeader>

            {editing && detail ? (
              <ItemEditForm
                detail={detail}
                onCancel={() => setEditing(false)}
                onSaved={(updated) => {
                  onUpdated(updated);
                  setEditing(false);
                }}
              />
            ) : (
              <>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              {item.description && (
                <SheetDescription className="text-sm text-foreground">
                  {item.description}
                </SheetDescription>
              )}

              {(() => {
                // Code types and notes/prompts display their content in an
                // editor whose own header carries the copy button — so the
                // section-level copy is hidden in those cases to avoid two
                // copy controls.
                const typeName = detail?.type.name.toLowerCase();
                const showCodeEditor =
                  !!detail &&
                  CODE_CONTENT_TYPES.has(typeName!) &&
                  !!detail.content;
                const showMarkdown =
                  !!detail &&
                  MARKDOWN_CONTENT_TYPES.has(typeName!) &&
                  !!detail.content;
                const showEditorHeader = showCodeEditor || showMarkdown;

                return (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Content</SectionLabel>
                      {detail && !showEditorHeader && (
                        <CopyButton
                          text={copyableText(detail)}
                          size="sm"
                          withLabel
                        />
                      )}
                    </div>
                    {loading && !detail ? (
                      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : error ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-sm text-destructive">
                          Couldn&apos;t load this item. Please try again.
                        </p>
                      </div>
                    ) : showCodeEditor && detail ? (
                      <CodeEditor
                        value={detail.content ?? ""}
                        language={detail.language}
                        readOnly
                      />
                    ) : showMarkdown && detail ? (
                      <MarkdownEditor value={detail.content ?? ""} readOnly />
                    ) : detail ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <ContentBody detail={detail} />
                      </div>
                    ) : null}
                  </section>
                );
              })()}

              {item.tags.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel>Tags</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {detail?.collection && (
                <section className="space-y-2">
                  <SectionLabel>Collection</SectionLabel>
                  <p className="text-sm text-foreground">
                    {detail.collection.name}
                  </p>
                </section>
              )}

              <p className="text-xs text-muted-foreground">
                Last updated {relativeTime(item.updatedAt)}
              </p>
            </div>

            <SheetFooter className="flex-row gap-2 border-t border-border p-4">
              <CopyButton
                text={detail ? copyableText(detail) : ""}
                variant="default"
                size="default"
                label="Copy to clipboard"
                withLabel
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                disabled={!detail}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            </SheetFooter>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
