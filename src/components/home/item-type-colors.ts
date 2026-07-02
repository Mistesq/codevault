// Canonical item-type accent colors (mirrors prisma/seed.ts). Used only inside
// product-shaped surfaces on the homepage — the dashboard preview and feature
// cards — and driven through a `--c` CSS custom property so a single set of
// Tailwind arbitrary utilities (e.g. text-[color:var(--c)]) can render every
// per-type tint. Marketing chrome stays blue-accent + neutral, never these.
export const ITEM_TYPE_COLORS = {
  snippet: "#3b82f6",
  prompt: "#8b5cf6",
  command: "#f97316",
  note: "#fde047",
  file: "#6b7280",
  image: "#ec4899",
  url: "#10b981",
} as const;

export type ItemTypeKey = keyof typeof ITEM_TYPE_COLORS;
