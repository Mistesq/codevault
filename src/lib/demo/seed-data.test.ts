import { describe, expect, it } from "vitest";

import {
  DEMO_SEED_COLLECTIONS,
  DEMO_SEED_STANDALONE_ITEMS,
  allDemoSeedItems,
} from "@/lib/demo/seed-data";
import { ITEMS_PER_PAGE } from "@/lib/pagination";

// The system item types created by prisma/seed.ts. The canonical demo content
// may only reference these names — anything else would make the reset throw.
const SYSTEM_TYPE_NAMES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "URL",
];

// Curation invariants from the feature spec: the demo workspace must showcase
// the product with zero visitor actions. These tests pin the invariants so a
// future edit to the seed content can't silently regress the showcase.
describe("canonical demo seed content", () => {
  const items = allDemoSeedItems();

  it("has enough snippets that /items/snippets (and /items) paginate", () => {
    const snippets = items.filter((i) => i.typeName === "snippet");
    expect(snippets.length).toBeGreaterThan(ITEMS_PER_PAGE);
  });

  it("collects every item exactly once, with unique titles (batched insert keys join rows by title)", () => {
    const collected = DEMO_SEED_COLLECTIONS.flatMap((c) => c.items);
    expect(items).toHaveLength(
      collected.length + DEMO_SEED_STANDALONE_ITEMS.length,
    );
    const titles = items.map((i) => i.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("only references system item types", () => {
    for (const item of items) {
      expect(SYSTEM_TYPE_NAMES).toContain(item.typeName);
    }
  });

  it("spans multiple languages for syntax-highlighting variety", () => {
    const languages = new Set(
      items.map((i) => i.language).filter((l): l is string => Boolean(l)),
    );
    expect(languages.size).toBeGreaterThanOrEqual(3);
  });

  it("pre-fills the AI-style fields: every item has a description and tags", () => {
    for (const item of items) {
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has at least one favorited and one pinned item", () => {
    expect(items.some((i) => i.isFavorite)).toBe(true);
    expect(items.some((i) => i.isPinned)).toBe(true);
  });

  it("gives every item its type's payload (content or url)", () => {
    for (const item of items) {
      if (item.typeName === "URL") {
        expect(item.url).toBeTruthy();
      } else {
        expect(item.content).toBeTruthy();
      }
    }
  });

  it("uses unique collection names (per-user unique constraint)", () => {
    const names = DEMO_SEED_COLLECTIONS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("stays under the Free plan limits so the demo can still create content", () => {
    // Free tier: 50 items, 3 collections. Leave headroom for visitors to try
    // the create flows without instantly hitting the upgrade wall.
    expect(items.length).toBeLessThan(50);
    expect(DEMO_SEED_COLLECTIONS.length).toBeLessThan(3);
  });
});
