import { describe, expect, it } from "vitest";

import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

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

describe("createItemSchema", () => {
  const base = {
    type: "snippet" as const,
    title: "Title",
    description: "",
    content: "",
    language: "",
    url: "",
    tags: [],
  };

  it("requires a non-empty, trimmed title", () => {
    expect(createItemSchema.safeParse({ ...base, title: "  " }).success).toBe(
      false,
    );
  });

  it("rejects an unknown type", () => {
    expect(
      createItemSchema.safeParse({ ...base, type: "bogus" }).success,
    ).toBe(false);
  });

  it("normalizes empty optional fields to null and keeps content whitespace", () => {
    const parsed = createItemSchema.parse({ ...base, content: "  code  " });
    expect(parsed.description).toBeNull();
    expect(parsed.language).toBeNull();
    expect(parsed.url).toBeNull();
    expect(parsed.content).toBe("  code  ");
  });

  it("requires a URL when type is URL", () => {
    const missing = createItemSchema.safeParse({
      ...base,
      type: "URL",
      url: "",
    });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.issues[0]?.message).toMatch(/url/i);
  });

  it("rejects an invalid URL when type is URL", () => {
    expect(
      createItemSchema.safeParse({ ...base, type: "URL", url: "not-a-url" })
        .success,
    ).toBe(false);
    expect(
      createItemSchema.safeParse({
        ...base,
        type: "URL",
        url: "https://example.com",
      }).success,
    ).toBe(true);
  });

  it("does not require a URL for non-URL types", () => {
    expect(createItemSchema.safeParse({ ...base, type: "note" }).success).toBe(
      true,
    );
  });

  it("trims, drops empty, and dedupes tags", () => {
    const parsed = createItemSchema.parse({
      ...base,
      tags: [" react ", "react", "", "hooks"],
    });
    expect(parsed.tags).toEqual(["react", "hooks"]);
  });

  it("requires file metadata for file/image types", () => {
    // Missing upload metadata → rejected with a "upload a file" message.
    const missing = createItemSchema.safeParse({ ...base, type: "image" });
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toMatch(/upload a file/i);
    }

    // With metadata present → accepted.
    const ok = createItemSchema.safeParse({
      ...base,
      type: "image",
      fileUrl: "https://pub-test.r2.dev/uploads/u/image/a.png",
      fileName: "a.png",
      fileSize: 2048,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a non-positive or non-integer fileSize", () => {
    const bad = createItemSchema.safeParse({
      ...base,
      type: "file",
      fileUrl: "https://pub-test.r2.dev/uploads/u/file/a.pdf",
      fileName: "a.pdf",
      fileSize: 0,
    });
    expect(bad.success).toBe(false);
  });
});
