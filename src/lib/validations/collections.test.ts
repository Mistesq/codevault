import { describe, expect, it } from "vitest";

import { createCollectionSchema } from "@/lib/validations/collections";

// Pure schema unit tests — no DB, no mocks. The server action relies on this
// being the source of truth for collection create.

describe("createCollectionSchema", () => {
  it("requires a non-empty, trimmed name", () => {
    expect(createCollectionSchema.safeParse({ name: "  " }).success).toBe(false);

    const ok = createCollectionSchema.safeParse({ name: "  React Patterns  " });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.name).toBe("React Patterns");
  });

  it("normalizes empty/whitespace description to null", () => {
    expect(createCollectionSchema.parse({ name: "X" }).description).toBeNull();
    expect(
      createCollectionSchema.parse({ name: "X", description: "   " }).description,
    ).toBeNull();
  });

  it("trims a provided description", () => {
    const parsed = createCollectionSchema.parse({
      name: "X",
      description: "  My stuff  ",
    });
    expect(parsed.description).toBe("My stuff");
  });

  it("surfaces a friendly message when the name is missing", () => {
    const result = createCollectionSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/name/i);
  });
});
