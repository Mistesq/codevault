// Shared helper for the Items/Collections tab split used by /favorites and
// /recent. Framework-free so it's trivially unit-testable.

/** Which list a tabbed page (favorites, recent) is currently showing. */
export type ListTab = "items" | "collections";

/**
 * Parse a `?tab=` search param into a ListTab. Anything that isn't a known tab
 * (missing, unknown, arrays) falls back to the given default ("items").
 */
export function parseListTab(
  value: string | string[] | undefined,
  fallback: ListTab = "items",
): ListTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "items" || raw === "collections" ? raw : fallback;
}
