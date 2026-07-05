import { Pin } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The small "pinned" pin icon shown beside an item's title on cards and rows.
 * Renders nothing when the item isn't pinned. `className` overrides the default
 * size (e.g. the denser favorites list uses `size-3`).
 */
export function PinIndicator({
  pinned,
  className,
}: {
  pinned: boolean;
  className?: string;
}) {
  if (!pinned) return null;
  return (
    <Pin className={cn("size-3.5 shrink-0 text-muted-foreground", className)} />
  );
}
