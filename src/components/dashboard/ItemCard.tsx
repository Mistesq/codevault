"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { ExternalLink, Pin, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFileSize, relativeTime } from "@/lib/dashboard-data";
import type { DashboardItem } from "@/lib/db/items";
import { useItemDrawer } from "@/components/items/item-drawer-context";
import { TypeIcon } from "@/lib/type-icons";

function ContentPreview({ item }: { item: DashboardItem }) {
  if (item.contentType === "FILE" && item.fileName) {
    return (
      <p className="truncate font-mono text-xs text-muted-foreground">
        {item.fileName}
        {item.fileSize != null && ` · ${formatFileSize(item.fileSize)}`}
      </p>
    );
  }

  if (item.url) {
    return (
      <p className="flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
        <ExternalLink className="size-3 shrink-0" />
        <span className="truncate">{item.url}</span>
      </p>
    );
  }

  if (item.content) {
    return (
      <pre className="max-h-24 overflow-hidden whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
        {item.content}
      </pre>
    );
  }

  return null;
}

export function ItemCard({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();

  // Border accent is data-driven (item type color), so it's an inline style.
  const style: CSSProperties | undefined = item.type.color
    ? { borderColor: item.type.color }
    : undefined;

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openItem(item);
    }
  }

  return (
    <article
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => openItem(item)}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer flex-col gap-3 rounded-xl border-l-2 border-border bg-card p-4 transition-colors hover:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        {/* Inline color is data-driven (per item type) so it can't be a static class. */}
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
          style={item.type.color ? { color: item.type.color } : undefined}
        >
          <TypeIcon name={item.type.icon} className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold">{item.title}</h3>
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>

        <Star
          className={cn(
            "size-4 shrink-0",
            item.isFavorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40",
          )}
        />
      </div>

      <div className="rounded-lg bg-muted/40 p-3">
        <ContentPreview item={item} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {relativeTime(item.updatedAt)}
        </span>
      </div>
    </article>
  );
}
