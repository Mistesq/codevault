import { describe, expect, it } from "vitest";

import { buildExplainPrompt, MAX_CONTENT_CHARS } from "@/lib/ai/explain";
import { explainCodeSchema } from "@/lib/validations/ai";

describe("buildExplainPrompt", () => {
  it("includes the code plus provided language / type context", () => {
    const prompt = buildExplainPrompt({
      content: "const x = 1;",
      language: "TypeScript",
      typeLabel: "Snippet",
    });
    expect(prompt).toContain("Item type: Snippet");
    expect(prompt).toContain("Language: TypeScript");
    expect(prompt).toContain("Code:\nconst x = 1;");
    expect(prompt).toContain("Explain what this does");
  });

  it("omits empty / whitespace-only / null context fields", () => {
    const prompt = buildExplainPrompt({
      content: "ls -la",
      language: "  ",
      typeLabel: null,
    });
    expect(prompt).not.toContain("Language:");
    expect(prompt).not.toContain("Item type:");
    expect(prompt).toContain("Code:\nls -la");
  });

  it("works with only content", () => {
    const prompt = buildExplainPrompt({ content: "echo hi" });
    expect(prompt).toContain("Code:\necho hi");
  });

  it("truncates long content to the shared cap", () => {
    const content = "a".repeat(MAX_CONTENT_CHARS + 100);
    const prompt = buildExplainPrompt({ content });
    expect(prompt).toContain("a".repeat(MAX_CONTENT_CHARS));
    expect(prompt).not.toContain("a".repeat(MAX_CONTENT_CHARS + 1));
  });
});

describe("explainCodeSchema", () => {
  it("accepts code content and normalizes optional context to trimmed / null", () => {
    const parsed = explainCodeSchema.safeParse({
      content: "  const x = 1;  ",
      language: "  ts  ",
      type: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.content).toBe("const x = 1;");
      expect(parsed.data.language).toBe("ts");
      expect(parsed.data.type).toBeNull();
    }
  });

  it("rejects empty / whitespace-only content", () => {
    expect(explainCodeSchema.safeParse({ content: "" }).success).toBe(false);
    const parsed = explainCodeSchema.safeParse({ content: "   " });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("no code");
    }
  });
});
