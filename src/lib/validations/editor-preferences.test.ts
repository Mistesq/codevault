import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  parseEditorPreferences,
} from "@/lib/editor-preferences";
import { editorPreferencesSchema } from "@/lib/validations/editor-preferences";

describe("editorPreferencesSchema", () => {
  it("accepts the defaults", () => {
    const parsed = editorPreferencesSchema.safeParse(DEFAULT_EDITOR_PREFERENCES);
    expect(parsed.success).toBe(true);
  });

  it("accepts a fully valid payload", () => {
    const parsed = editorPreferencesSchema.safeParse({
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: "github-dark",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an out-of-range font size", () => {
    const parsed = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 99,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an out-of-range tab size", () => {
    const parsed = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      tabSize: 3,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown theme", () => {
    const parsed = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: "solarized",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const parsed = editorPreferencesSchema.safeParse({ fontSize: 14 });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-boolean toggles", () => {
    const parsed = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      wordWrap: "on",
    });
    expect(parsed.success).toBe(false);
  });

  // The schema is the server-side gate; the parser is the read-side normalizer.
  // A value the parser keeps should also pass the schema.
  it("agrees with the parser on valid input", () => {
    const valid = parseEditorPreferences({
      fontSize: 12,
      tabSize: 8,
      wordWrap: true,
      minimap: false,
      theme: "vs-dark",
    });
    expect(editorPreferencesSchema.safeParse(valid).success).toBe(true);
  });
});
