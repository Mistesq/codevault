// Pagination constants and pure helpers shared by the paginated list pages and
// their DB queries. Kept framework-free so they're trivially unit-testable.

// Page sizes for the list pages.
export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;

// Dashboard section caps (the dashboard isn't paginated — it shows a slice).
export const DASHBOARD_COLLECTIONS_LIMIT = 6;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

/** A page slice plus the metadata the UI needs to render page controls. */
export interface Paginated<T> {
  items: T[];
  // The effective (clamped) 1-based page actually returned.
  page: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Parse a `?page=` search param into a 1-based page number. Anything that
 * isn't a positive integer (missing, "0", "abc", "-2", arrays) falls back to 1.
 * Out-of-range-high values are left as-is here and clamped against the real
 * total later (see clampPage).
 */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Total number of pages for a row count and page size (always at least 1). */
export function totalPagesFor(totalCount: number, perPage: number): number {
  return Math.max(1, Math.ceil(totalCount / perPage));
}

/** Clamp a requested page into the valid [1, totalPages] range. */
export function clampPage(page: number, totalPages: number): number {
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

/** The byte offset (skip) for a given page and page size. */
export function pageOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

export type PageToken = number | "ellipsis";

/**
 * Build the sequence of page tokens to render: numbered links with "ellipsis"
 * gaps. Up to 7 pages are shown in full; beyond that it collapses to
 * first · … · current-1 · current · current+1 · … · last.
 */
export function getPageRange(current: number, total: number): PageToken[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) tokens.push("ellipsis");
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < total - 1) tokens.push("ellipsis");

  tokens.push(total);
  return tokens;
}
