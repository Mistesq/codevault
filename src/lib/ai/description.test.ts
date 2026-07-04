import { describe, expect, it } from "vitest";

import {
  buildDescriptionPrompt,
  MAX_CONTENT_CHARS,
  MAX_DESCRIPTION_CHARS,
  parseDescription,
} from "@/lib/ai/description";
import { describeItemSchema } from "@/lib/validations/ai";

describe("buildDescriptionPrompt", () => {
  it("includes each provided field with its label", () => {
    const prompt = buildDescriptionPrompt({
      title: "useDebounce",
      typeLabel: "Snippet",
      language: "TypeScript",
      url: null,
      content: "export function useDebounce() {}",
    });
    expect(prompt).toContain("Item type: Snippet");
    expect(prompt).toContain("Title: useDebounce");
    expect(prompt).toContain("Language: TypeScript");
    expect(prompt).toContain("Content:\nexport function useDebounce() {}");
    expect(prompt).not.toContain("URL:");
  });

  it("omits empty / whitespace-only / null fields", () => {
    const prompt = buildDescriptionPrompt({
      title: "  ",
      typeLabel: null,
      content: "",
      url: "https://example.com",
    });
    expect(prompt).not.toContain("Title:");
    expect(prompt).not.toContain("Item type:");
    expect(prompt).not.toContain("Content:");
    expect(prompt).toContain("URL: https://example.com");
  });

  it("works for a link item with only a url", () => {
    const prompt = buildDescriptionPrompt({ url: "https://neon.tech" });
    expect(prompt).toContain("URL: https://neon.tech");
    expect(prompt).toContain("Write a concise 1-2 sentence description");
  });

  it("truncates long content", () => {
    const content = "a".repeat(MAX_CONTENT_CHARS + 100);
    const prompt = buildDescriptionPrompt({ title: "T", content });
    expect(prompt).toContain("a".repeat(MAX_CONTENT_CHARS));
    expect(prompt).not.toContain("a".repeat(MAX_CONTENT_CHARS + 1));
  });
});

describe("parseDescription", () => {
  it("trims and collapses whitespace/newlines", () => {
    expect(parseDescription("  A tidy   summary.\nSecond line.  ")).toBe(
      "A tidy summary. Second line.",
    );
  });

  it("strips a single pair of wrapping quotes or backticks", () => {
    expect(parseDescription('"A quoted description."')).toBe(
      "A quoted description.",
    );
    expect(parseDescription("'single quoted'")).toBe("single quoted");
    expect(parseDescription("`code fenced`")).toBe("code fenced");
  });

  it("keeps at most two sentences", () => {
    expect(
      parseDescription("One sentence. Two sentences. Three sentences."),
    ).toBe("One sentence. Two sentences.");
  });

  it("leaves punctuation-free text untouched", () => {
    expect(parseDescription("a bare fragment with no period")).toBe(
      "a bare fragment with no period",
    );
  });

  it("hard-caps the length with an ellipsis", () => {
    const long = "word ".repeat(200); // no sentence punctuation → length cap applies
    const result = parseDescription(long);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_CHARS + 1);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns '' for empty / whitespace / nullish input", () => {
    expect(parseDescription("")).toBe("");
    expect(parseDescription("   ")).toBe("");
    expect(parseDescription(null)).toBe("");
    expect(parseDescription(undefined)).toBe("");
  });
});

describe("describeItemSchema", () => {
  it("accepts input with a title and normalizes fields to trimmed / null", () => {
    const parsed = describeItemSchema.safeParse({
      title: "  My Snippet  ",
      content: "",
      type: "snippet",
      url: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("My Snippet");
      expect(parsed.data.content).toBeNull();
      expect(parsed.data.type).toBe("snippet");
      expect(parsed.data.url).toBeNull();
    }
  });

  it("accepts content-only and url-only input", () => {
    expect(describeItemSchema.safeParse({ content: "some code" }).success).toBe(
      true,
    );
    expect(
      describeItemSchema.safeParse({ url: "https://example.com" }).success,
    ).toBe(true);
  });

  it("rejects when title, content, and url are all empty", () => {
    const parsed = describeItemSchema.safeParse({
      title: "   ",
      content: "",
      type: "snippet",
      language: "ts",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("Add a title");
    }
  });
});
