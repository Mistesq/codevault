import { describe, expect, it } from "vitest";

import { pluralTypeLabel, typeLabel } from "@/lib/type-icons";

describe("typeLabel", () => {
  it("capitalizes the first letter, leaving the rest intact", () => {
    expect(typeLabel("snippet")).toBe("Snippet");
    expect(typeLabel("URL")).toBe("URL");
  });
});

describe("pluralTypeLabel", () => {
  it("capitalizes and pluralizes normal type names", () => {
    expect(pluralTypeLabel("snippet")).toBe("Snippets");
    expect(pluralTypeLabel("prompt")).toBe("Prompts");
    expect(pluralTypeLabel("file")).toBe("Files");
  });

  it("renders the URL type as 'Links' (case-insensitive)", () => {
    expect(pluralTypeLabel("URL")).toBe("Links");
    expect(pluralTypeLabel("url")).toBe("Links");
  });

  it("does not double-pluralize a name already ending in 's'", () => {
    expect(pluralTypeLabel("news")).toBe("News");
  });
});
