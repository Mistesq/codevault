// Curated list of languages offered by the code editor's language dropdown.
// `value` is what we store on the item and hand to Monaco (via the CodeEditor's
// own alias map), so these are canonical Monaco language ids; `label` is the
// friendly display/search text. Shared by the create dialog and the drawer edit
// form so both offer the same set.

export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "tsx", label: "TSX (React)" },
  { value: "jsx", label: "JSX (React)" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "dart", label: "Dart" },
  { value: "scala", label: "Scala" },
  { value: "sql", label: "SQL" },
  { value: "shell", label: "Shell / Bash" },
  { value: "powershell", label: "PowerShell" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
  { value: "xml", label: "XML" },
  { value: "toml", label: "TOML" },
  { value: "ini", label: "INI" },
  { value: "lua", label: "Lua" },
  { value: "r", label: "R" },
  { value: "perl", label: "Perl" },
  { value: "plaintext", label: "Plain text" },
];

/**
 * Resolves a stored `language` string to its display label. Falls back to the
 * raw value (e.g. a legacy/free-text language the curated list doesn't cover) so
 * the dropdown can still show it.
 */
export function languageLabel(value: string): string {
  return LANGUAGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
