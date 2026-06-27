import { describe, expect, it } from "vitest";

import { updateItemSchema } from "@/lib/validations/items";

// Pure schema unit tests — no DB, no mocks. The server action relies on this
// being the source of truth, so the normalization/validation rules matter.

describe("updateItemSchema", () => {
  const base = {
    title: "Title",
    description: "",
    content: "",
    language: "",
    url: "",
    tags: [],
  };

  it("requires a non-empty, trimmed title", () => {
    expect(updateItemSchema.safeParse({ ...base, title: "  " }).success).toBe(
      false,
    );

    const ok = updateItemSchema.safeParse({ ...base, title: "  Hello  " });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.title).toBe("Hello");
  });

  it("normalizes empty optional text fields to null", () => {
    const parsed = updateItemSchema.parse(base);
    expect(parsed.description).toBeNull();
    expect(parsed.content).toBeNull();
    expect(parsed.language).toBeNull();
    expect(parsed.url).toBeNull();
  });

  it("does not trim content (preserves meaningful whitespace)", () => {
    const parsed = updateItemSchema.parse({ ...base, content: "  code  " });
    expect(parsed.content).toBe("  code  ");
  });

  it("accepts a valid URL and rejects an invalid one", () => {
    expect(
      updateItemSchema.safeParse({ ...base, url: "https://example.com" })
        .success,
    ).toBe(true);
    expect(
      updateItemSchema.safeParse({ ...base, url: "not-a-url" }).success,
    ).toBe(false);
  });

  it("trims, drops empty, and dedupes tags", () => {
    const parsed = updateItemSchema.parse({
      ...base,
      tags: [" react ", "react", "", "  ", "hooks"],
    });
    expect(parsed.tags).toEqual(["react", "hooks"]);
  });
});
