// Which item types render their content in which editor. Shared so the create
// dialog, the drawer edit form, and the read-only drawer stay in sync.
//
// Code types (snippet/command) use the Monaco CodeEditor; notes & prompts use
// the Markdown editor; everything else (url/file/image) keeps a plain block.
// Plain `Set<string>` so callers can probe with either a lowercased type name
// or a `CreateItemType` value.

export const CODE_CONTENT_TYPES = new Set<string>(["snippet", "command"]);
export const MARKDOWN_CONTENT_TYPES = new Set<string>(["note", "prompt"]);
