import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  parseEditorPreferences,
} from "@/lib/editor-preferences";

describe("parseEditorPreferences", () => {
  it("returns the defaults for null/undefined/non-objects", () => {
    expect(parseEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(parseEditorPreferences(undefined)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(parseEditorPreferences("nope")).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(parseEditorPreferences(42)).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("returns a fresh copy, not the shared default object", () => {
    const result = parseEditorPreferences(null);
    expect(result).not.toBe(DEFAULT_EDITOR_PREFERENCES);
  });

  it("keeps valid values", () => {
    const prefs = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: "monokai",
    };
    expect(parseEditorPreferences(prefs)).toEqual(prefs);
  });

  it("falls back per-field for invalid values", () => {
    const result = parseEditorPreferences({
      fontSize: 99, // not in FONT_SIZE_OPTIONS
      tabSize: 3, // not in TAB_SIZE_OPTIONS
      wordWrap: "yes", // not a boolean
      minimap: 1, // not a boolean
      theme: "solarized", // not a valid theme
    });
    expect(result).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("fills missing fields with defaults", () => {
    const result = parseEditorPreferences({ fontSize: 18 });
    expect(result).toEqual({ ...DEFAULT_EDITOR_PREFERENCES, fontSize: 18 });
  });
});
