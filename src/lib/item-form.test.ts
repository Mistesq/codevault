import { describe, expect, it } from "vitest";

import { buildItemFields, parseTags } from "@/lib/item-form";

describe("parseTags", () => {
  it("trims, drops blanks, and splits on commas", () => {
    expect(parseTags(" react ,  , hooks,")).toEqual(["react", "hooks"]);
  });

  it("returns an empty array for an empty / whitespace input", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags("   ")).toEqual([]);
  });
});

describe("buildItemFields", () => {
  const base = {
    title: "Title",
    description: "Desc",
    content: "code",
    language: "tsx",
    url: "https://example.com",
    tags: "react, hooks",
    showContent: true,
    showLanguage: true,
    showUrl: true,
  };

  it("passes through shown fields and parses tags", () => {
    expect(buildItemFields(base)).toEqual({
      title: "Title",
      description: "Desc",
      content: "code",
      language: "tsx",
      url: "https://example.com",
      tags: ["react", "hooks"],
    });
  });

  it("nulls hidden fields (content/language/url) without touching title/description", () => {
    expect(
      buildItemFields({
        ...base,
        showContent: false,
        showLanguage: false,
        showUrl: false,
      }),
    ).toEqual({
      title: "Title",
      description: "Desc",
      content: null,
      language: null,
      url: null,
      tags: ["react", "hooks"],
    });
  });
});
