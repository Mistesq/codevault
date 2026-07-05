import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Count + pluralized noun, e.g. `pluralize(1, "item") === "1 item"` and
 * `pluralize(3, "item") === "3 items"`. Pass `plural` for irregular words.
 * Collapses the `{n} {n === 1 ? "x" : "xs"}` ternary repeated across list pages.
 */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`
}
