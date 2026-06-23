import type { ComponentType, CSSProperties } from "react";
import {
  Code2,
  ExternalLink,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Pin,
  Sparkles,
  Star,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatFileSize,
  getItemType,
  relativeTime,
} from "@/lib/dashboard-data";
import type { Item } from "@/lib/mock-data";

type IconComponent = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

const TYPE_ICONS: Record<string, IconComponent> = {
  Code2,
  Sparkles,
  FileText,
  Terminal,
  File: FileIcon,
  Image: ImageIcon,
  Link: LinkIcon,
};

function ContentPreview({ item }: { item: Item }) {
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

export function ItemCard({ item }: { item: Item }) {
  const type = getItemType(item.typeId);
  const Icon = type ? TYPE_ICONS[type.icon] ?? FileIcon : FileIcon;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/40">
      <div className="flex items-start gap-3">
        {/* Inline color is data-driven (per item type) so it can't be a static class. */}
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
          style={type ? { color: type.color } : undefined}
        >
          <Icon className="size-4" />
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
