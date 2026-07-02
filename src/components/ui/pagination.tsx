import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPageRange } from "@/lib/pagination";

interface PaginationProps {
  page: number;
  totalPages: number;
  // Base path without a query string, e.g. "/items/snippets" or "/collections".
  baseHref: string;
  // Query param carrying the page number. Defaults to "page"; override when a
  // route has more than one independent pager (e.g. "itemsPage").
  pageParam?: string;
  // Other query params to preserve on every link — lets a second pager on the
  // same route keep its position while this one navigates.
  extraParams?: Record<string, string | number>;
}

const cellBase =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-transparent px-2 text-sm font-medium transition-colors";

/**
 * Bottom-of-list pagination: numbered page links with prev/next chevrons.
 * Prev/next render as greyed-out, non-interactive spans at the ends. Renders
 * nothing when there's a single page. Designed for server components — page
 * navigation is plain links carrying `?page=N` (page 1 stays a clean URL).
 */
export function Pagination({
  page,
  totalPages,
  baseHref,
  pageParam = "page",
  extraParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      params.set(key, String(value));
    }
    // Page 1 stays a clean URL for this param (it's just omitted).
    if (p > 1) params.set(pageParam, String(p));
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };
  const tokens = getPageRange(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 pt-2"
    >
      <PrevNext direction="prev" href={hrefFor(page - 1)} disabled={page <= 1} />

      {tokens.map((token, i) =>
        token === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={token}
            href={hrefFor(token)}
            aria-current={token === page ? "page" : undefined}
            className={cn(
              cellBase,
              token === page
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            {token}
          </Link>
        ),
      )}

      <PrevNext
        direction="next"
        href={hrefFor(page + 1)}
        disabled={page >= totalPages}
      />
    </nav>
  );
}

function PrevNext({
  direction,
  href,
  disabled,
}: {
  direction: "prev" | "next";
  href: string;
  disabled: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous page" : "Next page";

  if (disabled) {
    return (
      <span
        aria-disabled
        aria-label={label}
        className={cn(
          cellBase,
          "pointer-events-none text-muted-foreground opacity-50",
        )}
      >
        <Icon className="size-4" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(cellBase, "text-foreground hover:bg-muted")}
    >
      <Icon className="size-4" />
    </Link>
  );
}
