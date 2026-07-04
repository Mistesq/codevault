import { describe, expect, it } from "vitest";

import {
  buildTaggingPrompt,
  isRateLimitError,
  MAX_CONTENT_CHARS,
  MAX_TAGS,
  parseTagSuggestions,
  truncateContent,
} from "@/lib/ai/tagging";

describe("truncateContent", () => {
  it("returns short content unchanged", () => {
    expect(truncateContent("hello")).toBe("hello");
  });

  it("caps content at MAX_CONTENT_CHARS", () => {
    const long = "x".repeat(MAX_CONTENT_CHARS + 500);
    expect(truncateContent(long)).toHaveLength(MAX_CONTENT_CHARS);
  });

  it("respects a custom max", () => {
    expect(truncateContent("abcdef", 3)).toBe("abc");
  });
});

describe("buildTaggingPrompt", () => {
  it("includes the title", () => {
    const prompt = buildTaggingPrompt({ title: "My Snippet" });
    expect(prompt).toContain("Title: My Snippet");
  });

  it("omits the Content section when content is empty/null", () => {
    expect(buildTaggingPrompt({ title: "T", content: null })).not.toContain(
      "Content:",
    );
    expect(buildTaggingPrompt({ title: "T", content: "   " })).not.toContain(
      "Content:",
    );
  });

  it("includes and truncates content", () => {
    const content = "a".repeat(MAX_CONTENT_CHARS + 100);
    const prompt = buildTaggingPrompt({ title: "T", content });
    expect(prompt).toContain("Content:");
    // The overall prompt carries the title + labels, but the content slice is capped.
    expect(prompt).toContain("a".repeat(MAX_CONTENT_CHARS));
    expect(prompt).not.toContain("a".repeat(MAX_CONTENT_CHARS + 1));
  });
});

describe("parseTagSuggestions", () => {
  it("parses the { tags: [...] } shape", () => {
    expect(parseTagSuggestions('{"tags":["React","Hooks"]}')).toEqual([
      "react",
      "hooks",
    ]);
  });

  it("parses a bare array shape", () => {
    expect(parseTagSuggestions('["TypeScript","zod"]')).toEqual([
      "typescript",
      "zod",
    ]);
  });

  it("lowercases, trims, and dedupes", () => {
    expect(parseTagSuggestions('["React"," react ","REACT","vue"]')).toEqual([
      "react",
      "vue",
    ]);
  });

  it("drops empty and over-long entries and non-strings", () => {
    const tags = parseTagSuggestions(
      JSON.stringify(["ok", "", "  ", "x".repeat(40), 5, null, "fine"]),
    );
    expect(tags).toEqual(["ok", "fine"]);
  });

  it("caps the result at MAX_TAGS", () => {
    const many = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    expect(parseTagSuggestions(JSON.stringify(many))).toHaveLength(MAX_TAGS);
  });

  it("returns [] for malformed JSON", () => {
    expect(parseTagSuggestions("not json")).toEqual([]);
    expect(parseTagSuggestions("")).toEqual([]);
    expect(parseTagSuggestions(null)).toEqual([]);
    expect(parseTagSuggestions(undefined)).toEqual([]);
  });

  it("returns [] when the JSON has no usable tags array", () => {
    expect(parseTagSuggestions('{"foo":"bar"}')).toEqual([]);
    expect(parseTagSuggestions('{"tags":"react"}')).toEqual([]);
    expect(parseTagSuggestions("42")).toEqual([]);
  });
});

describe("isRateLimitError", () => {
  it("detects a numeric 429 status", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError({ code: 429 })).toBe(true);
  });

  it("detects RESOURCE_EXHAUSTED and 429 in the message", () => {
    expect(isRateLimitError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("RESOURCE_EXHAUSTED: quota"))).toBe(true);
  });

  it("is false for unrelated errors and nullish input", () => {
    expect(isRateLimitError(new Error("boom"))).toBe(false);
    expect(isRateLimitError({ status: 500 })).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });
});
