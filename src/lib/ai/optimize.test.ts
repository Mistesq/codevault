import { describe, expect, it } from "vitest";

import {
  buildOptimizePrompt,
  MAX_CONTENT_CHARS,
  parseOptimizedPrompt,
} from "@/lib/ai/optimize";
import { optimizePromptSchema } from "@/lib/validations/ai";

describe("buildOptimizePrompt", () => {
  it("includes the prompt content and the refine instruction", () => {
    const prompt = buildOptimizePrompt({ content: "Write a poem." });
    expect(prompt).toContain("Refine the following prompt.");
    expect(prompt).toContain("Prompt:\nWrite a poem.");
    expect(prompt).toContain("Return only the improved prompt.");
  });

  it("trims surrounding whitespace from the content", () => {
    const prompt = buildOptimizePrompt({ content: "   hello   " });
    expect(prompt).toContain("Prompt:\nhello");
  });

  it("truncates long content to the shared cap", () => {
    const content = "a".repeat(MAX_CONTENT_CHARS + 100);
    const prompt = buildOptimizePrompt({ content });
    expect(prompt).toContain("a".repeat(MAX_CONTENT_CHARS));
    expect(prompt).not.toContain("a".repeat(MAX_CONTENT_CHARS + 1));
  });
});

describe("parseOptimizedPrompt", () => {
  it("returns the trimmed text unchanged for a plain response", () => {
    expect(parseOptimizedPrompt("  Improved prompt.  ")).toBe(
      "Improved prompt.",
    );
  });

  it("strips a wrapping code fence (with a language label)", () => {
    const raw = "```text\nImproved prompt.\n```";
    expect(parseOptimizedPrompt(raw)).toBe("Improved prompt.");
  });

  it("strips a wrapping code fence without a language label", () => {
    const raw = "```\nline one\nline two\n```";
    expect(parseOptimizedPrompt(raw)).toBe("line one\nline two");
  });

  it("leaves legitimate wrapping quotes intact", () => {
    expect(parseOptimizedPrompt('"Quoted prompt"')).toBe('"Quoted prompt"');
  });

  it("returns an empty string for empty / nullish input", () => {
    expect(parseOptimizedPrompt("")).toBe("");
    expect(parseOptimizedPrompt("   ")).toBe("");
    expect(parseOptimizedPrompt(null)).toBe("");
    expect(parseOptimizedPrompt(undefined)).toBe("");
  });
});

describe("optimizePromptSchema", () => {
  it("accepts and trims prompt content", () => {
    const parsed = optimizePromptSchema.safeParse({ content: "  refine me  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.content).toBe("refine me");
  });

  it("rejects empty / whitespace-only content", () => {
    expect(optimizePromptSchema.safeParse({ content: "" }).success).toBe(false);
    const parsed = optimizePromptSchema.safeParse({ content: "   " });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("no prompt");
    }
  });
});
