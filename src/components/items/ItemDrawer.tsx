"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CopyButton } from "@/components/items/CopyButton";
import { DrawerActionBar } from "@/components/items/DrawerActionBar";
import { DrawerContentSection } from "@/components/items/DrawerContentSection";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { SectionLabel } from "@/components/items/SectionLabel";
import { relativeTime } from "@/lib/dashboard-data";
import type { DashboardItem, ItemDetail } from "@/lib/db/items";
import type { SelectableCollection } from "@/lib/db/collections";
import { TypeIcon, typeLabel } from "@/lib/type-icons";

/** The text the Copy actions place on the clipboard for a given item. */
function copyableText(detail: ItemDetail): string {
  if (detail.contentType === "FILE") return detail.fileName ?? "";
  if (detail.url) return detail.url;
  return detail.content ?? "";
}

export function ItemDrawer({
  open,
  onOpenChange,
  item,
  detail,
  collections,
  isPro,
  loading,
  error,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DashboardItem | null;
  detail: ItemDetail | null;
  collections: SelectableCollection[];
  isPro: boolean;
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

  const copyText = detail ? copyableText(detail) : "";

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

              {/* Action bar — replaced by the edit form's Save/Cancel when editing. */}
              {!editing && (
                <DrawerActionBar
                  item={item}
                  detail={detail}
                  copyText={copyText}
                  onEdit={() => setEditing(true)}
                  onDeleted={onDeleted}
                />
              )}
            </SheetHeader>

            {editing && detail ? (
              <ItemEditForm
                detail={detail}
                collections={collections}
                isPro={isPro}
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

                  <DrawerContentSection
                    detail={detail}
                    loading={loading}
                    error={error}
                    copyText={copyText}
                    isPro={isPro}
                  />

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

                  {detail && detail.collections.length > 0 && (
                    <section className="space-y-2">
                      <SectionLabel>
                        {detail.collections.length === 1
                          ? "Collection"
                          : "Collections"}
                      </SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.collections.map((collection) => (
                          <span
                            key={collection.id}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                          >
                            {collection.name}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Last updated {relativeTime(item.updatedAt)}
                  </p>
                </div>

                <SheetFooter className="flex-row gap-2 border-t border-border p-4">
                  <CopyButton
                    text={copyText}
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
