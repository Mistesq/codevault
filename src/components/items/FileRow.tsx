"use client";

import type { MouseEvent } from "react";
import {
  Download,
  File as FileIcon,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useItemDrawer } from "@/components/items/item-drawer-context";
import { useActivateOnEnter } from "@/components/items/use-activate-on-enter";
import { PinIndicator } from "@/components/items/PinIndicator";
import { formatFileSize, relativeTime } from "@/lib/dashboard-data";
import type { DashboardItem } from "@/lib/db/items";
import type { IconComponent } from "@/lib/type-icons";

// Maps a file extension to a lucide icon (Google-Drive-style).
const EXT_ICONS: Record<string, IconComponent> = {
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
  svg: FileImage,
  json: FileJson,
  yaml: FileCode,
  yml: FileCode,
  xml: FileCode,
  toml: FileCode,
  ini: FileCode,
  csv: FileSpreadsheet,
  pdf: FileText,
  txt: FileText,
  md: FileText,
};

// Renders the icon for a file name via a static map lookup (not a call that
// returns a component) so it stays a stable, statically-referenced component.
function FileTypeIcon({ fileName }: { fileName: string | null }) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const Icon = EXT_ICONS[ext] ?? FileIcon;
  return <Icon className="size-5" />;
}

/**
 * Single list row for a File item — the /items/files view renders these in a
 * single column (Google Drive / Dropbox style) instead of grid cards. Clicking
 * the row opens the shared ItemDrawer; the Download button streams the file
 * through the same-origin proxy and stops propagation so it doesn't open it.
 */
export function FileRow({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();
  const handleKeyDown = useActivateOnEnter<HTMLElement>(() => openItem(item));

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => openItem(item)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileTypeIcon fileName={item.fileName} />
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <h3 className="min-w-0 truncate text-sm font-medium">
          {item.fileName ?? item.title}
        </h3>
        <PinIndicator pinned={item.isPinned} />
        {item.isFavorite && (
          <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground sm:shrink-0">
        <span className="w-20 sm:text-right">
          {item.fileSize != null ? formatFileSize(item.fileSize) : "—"}
        </span>
        <span className="w-24 sm:text-right">
          {relativeTime(item.updatedAt)}
        </span>
        <Button
          variant="outline"
          size="sm"
          // Rendering as an <a>, so opt out of native-button semantics.
          nativeButton={false}
          // Don't let the download click bubble up and open the drawer.
          onClick={(e: MouseEvent) => e.stopPropagation()}
          render={
            <a
              href={`/api/items/${item.id}/download`}
              download
              rel="noreferrer"
            />
          }
        >
          <Download className="size-4" />
          <span className="sr-only sm:not-sr-only">Download</span>
        </Button>
      </div>
    </article>
  );
}
