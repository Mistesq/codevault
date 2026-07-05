// Which item types render their content in which editor. Shared so the create
// dialog, the drawer edit form, and the read-only drawer stay in sync.
//
// Code types (snippet/command) use the Monaco CodeEditor; notes & prompts use
// the Markdown editor; everything else (url/file/image) keeps a plain block.
// Plain `Set<string>` so callers can probe with either a lowercased type name
// or a `CreateItemType` value.

export const CODE_CONTENT_TYPES = new Set<string>(["snippet", "command"]);
export const MARKDOWN_CONTENT_TYPES = new Set<string>(["note", "prompt"]);

// Single source of truth for which type-specific fields the create dialog and
// the drawer edit form show. Plain lowercased names so both a `CreateItemType`
// value (snippet/prompt/command/note) and a lowercased type name match.

// Types that show a free-text Content field (the code + markdown editor types).
export const CONTENT_FIELD_TYPES = new Set<string>([
  ...CODE_CONTENT_TYPES,
  ...MARKDOWN_CONTENT_TYPES,
]);

// Types that show a "language" field — the same set that uses the code editor.
export const LANGUAGE_FIELD_TYPES = CODE_CONTENT_TYPES;

// Types that store an uploaded file/image instead of text content.
export const FILE_FIELD_TYPES = new Set<string>(["file", "image"]);

// Predicates for the two upload types, shared by the list pages and the drawer
// so the `type.name.toLowerCase() === ...` check lives in one place. Names are
// stored lowercase (except "URL"), but lowercase defensively regardless.
export function isImageType(name: string): boolean {
  return name.toLowerCase() === "image";
}

export function isFileType(name: string): boolean {
  return name.toLowerCase() === "file";
}
