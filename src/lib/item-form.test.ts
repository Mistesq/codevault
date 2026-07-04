import { describe, expect, it } from "vitest";

import { addTag, buildItemFields, parseTags } from "@/lib/item-form";

describe("parseTags", () => {
  it("trims, drops blanks, and splits on commas", () => {
    expect(parseTags(" react ,  , hooks,")).toEqual(["react", "hooks"]);
  });

  it("returns an empty array for an empty / whitespace input", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags("   ")).toEqual([]);
  });
});

describe("addTag", () => {
  it("appends a tag to an existing comma-separated list", () => {
    expect(addTag("react, hooks", "state")).toBe("react, hooks, state");
  });

  it("adds the first tag to an empty input", () => {
    expect(addTag("", "react")).toBe("react");
    expect(addTag("   ", "react")).toBe("react");
  });

  it("ignores a duplicate that already exists in the list", () => {
    expect(addTag("react, hooks", "react")).toBe("react, hooks");
  });

  it("trims the incoming tag and ignores a blank one", () => {
    expect(addTag("react", "  hooks  ")).toBe("react, hooks");
    expect(addTag("react", "   ")).toBe("react");
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
