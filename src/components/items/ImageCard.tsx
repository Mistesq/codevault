"use client";

import type { KeyboardEvent } from "react";
import { ImageIcon, Pin, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardItem } from "@/lib/db/items";
import { useItemDrawer } from "@/components/items/item-drawer-context";

/**
 * Gallery thumbnail card for Image items. Replaces the standard ItemCard on the
 * /items/images grid: a 16:9 cover thumbnail with a subtle hover zoom, opening
 * the shared ItemDrawer on click (same as every other card).
 */
export function ImageCard({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openItem(item);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => openItem(item)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {item.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.fileUrl}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.title}
        </h3>
        {item.isPinned && (
          <Pin className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <Star
          className={cn(
            "size-4 shrink-0",
            item.isFavorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40",
          )}
        />
      </div>
    </article>
  );
}
