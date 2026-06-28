// Shared shaping for the item create/edit forms. Pure helpers (no React) so the
// New Item dialog and the drawer edit form build the same payload the same way.
// The server-side Zod schemas remain the source of truth; this just mirrors the
// per-type field visibility into the submitted shape.

/** Split a comma-separated tag input into a trimmed, de-blanked list. */
export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export interface ItemFieldInputs {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
  // Per-type field visibility — hidden fields submit as null.
  showContent: boolean;
  showLanguage: boolean;
  showUrl: boolean;
}

export interface ItemFieldPayload {
  title: string;
  description: string;
  content: string | null;
  language: string | null;
  url: string | null;
  tags: string[];
}

/**
 * The text fields both forms submit. Fields not shown for the chosen type are
 * nulled (content/language/url); tags are parsed from the comma-separated input.
 * The create form spreads this and adds `type` + file metadata.
 */
export function buildItemFields(inputs: ItemFieldInputs): ItemFieldPayload {
  return {
    title: inputs.title,
    description: inputs.description,
    content: inputs.showContent ? inputs.content : null,
    language: inputs.showLanguage ? inputs.language : null,
    url: inputs.showUrl ? inputs.url : null,
    tags: parseTags(inputs.tags),
  };
}
