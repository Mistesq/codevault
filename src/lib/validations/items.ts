import { z } from "zod";

// Item create/update payloads. The server actions are the source of truth —
// they validate this before touching the database.
//
// Optional text fields normalize empty/whitespace-only input to null so we
// don't persist empty strings. `content` is intentionally NOT trimmed: code and
// notes can have meaningful leading/trailing whitespace.

const optionalTrimmed = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

// `content` keeps its whitespace (code/notes), only collapsing empty → null.
const contentField = z
  .string()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

// Trim, drop empties, and dedupe so the join table stays clean.
const tagsField = z
  .array(z.string())
  .default([])
  .transform((tags) =>
    Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))),
  );

export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: optionalTrimmed,
  content: contentField,
  language: optionalTrimmed,
  url: optionalTrimmed.refine(
    (v) => v === null || z.url().safeParse(v).success,
    { message: "Enter a valid URL." },
  ),
  tags: tagsField,
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// Types the create dialog can choose. File/Image are out of scope (uploads),
// so only the text- and URL-based system types are selectable here. "URL"
// matches the system ItemType.name exactly (it's stored uppercase).
export const CREATE_ITEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "URL",
] as const;

export type CreateItemType = (typeof CREATE_ITEM_TYPES)[number];

export const createItemSchema = z
  .object({
    type: z.enum(CREATE_ITEM_TYPES),
    title: z.string().trim().min(1, "Title is required."),
    description: optionalTrimmed,
    content: contentField,
    language: optionalTrimmed,
    url: optionalTrimmed,
    tags: tagsField,
  })
  // URL items require a valid URL; other types tolerate a stray one being null.
  .superRefine((data, ctx) => {
    if (data.type !== "URL") return;
    if (!data.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "URL is required.",
      });
    } else if (!z.url().safeParse(data.url).success) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Enter a valid URL.",
      });
    }
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;
