// Shared shape, defaults, and option lists for the Monaco editor preferences
// stored on User.editorPreferences (a JSON column). Imported by the settings UI,
// the EditorPreferencesContext, the CodeEditor, the server action, and the Zod
// validation schema so they all agree on one source of truth.

export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const FONT_SIZE_OPTIONS = [12, 13, 14, 16, 18] as const;
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const;

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorTheme;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};

// Human-readable labels for the theme dropdown.
export const EDITOR_THEME_LABELS: Record<EditorTheme, string> = {
  "vs-dark": "VS Dark",
  monokai: "Monokai",
  "github-dark": "GitHub Dark",
};

function isEditorTheme(value: unknown): value is EditorTheme {
  return (
    typeof value === "string" && EDITOR_THEMES.includes(value as EditorTheme)
  );
}

function pickNumber(
  value: unknown,
  allowed: readonly number[],
  fallback: number,
): number {
  return typeof value === "number" && allowed.includes(value) ? value : fallback;
}

/**
 * Normalizes the loosely-typed JSON read from the database (or any untrusted
 * source) into a complete, valid EditorPreferences object, filling every field
 * with its default when missing or invalid. Always returns a usable object so
 * callers never have to deal with partial preferences.
 */
export function parseEditorPreferences(raw: unknown): EditorPreferences {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_EDITOR_PREFERENCES };
  }

  const value = raw as Record<string, unknown>;

  return {
    fontSize: pickNumber(
      value.fontSize,
      FONT_SIZE_OPTIONS,
      DEFAULT_EDITOR_PREFERENCES.fontSize,
    ),
    tabSize: pickNumber(
      value.tabSize,
      TAB_SIZE_OPTIONS,
      DEFAULT_EDITOR_PREFERENCES.tabSize,
    ),
    wordWrap:
      typeof value.wordWrap === "boolean"
        ? value.wordWrap
        : DEFAULT_EDITOR_PREFERENCES.wordWrap,
    minimap:
      typeof value.minimap === "boolean"
        ? value.minimap
        : DEFAULT_EDITOR_PREFERENCES.minimap,
    theme: isEditorTheme(value.theme)
      ? value.theme
      : DEFAULT_EDITOR_PREFERENCES.theme,
  };
}
