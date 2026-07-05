import { ExternalLink } from "lucide-react";

import { DownloadButton } from "@/components/items/DownloadButton";
import { formatFileSize } from "@/lib/dashboard-data";
import { isImageType } from "@/lib/item-content-types";
import type { ItemDetail } from "@/lib/db/items";

/** Rendered content body for a loaded item (text / url / file). */
export function ItemContentBody({ detail }: { detail: ItemDetail }) {
  if (detail.contentType === "FILE") {
    const isImage = isImageType(detail.type.name);
    return (
      <div className="space-y-3">
        {isImage && detail.fileUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.fileUrl}
            alt={detail.fileName ?? "Image"}
            className="max-h-72 w-full rounded-md border border-border object-contain"
          />
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-sm text-muted-foreground">
            {detail.fileName ?? "File"}
            {detail.fileSize != null && ` · ${formatFileSize(detail.fileSize)}`}
          </p>
          <DownloadButton itemId={detail.id} />
        </div>
      </div>
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
