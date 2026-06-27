import { z } from "zod";

// Update payload for the item drawer's edit mode. The server action is the
// source of truth — it validates this before touching the database.
//
// Optional text fields normalize empty/whitespace-only input to null so we
// don't persist empty strings. `content` is intentionally NOT trimmed: code and
// notes can have meaningful leading/trailing whitespace.

const optionalTrimmed = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: optionalTrimmed,
  content: z
    .string()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  language: optionalTrimmed,
  url: optionalTrimmed.refine(
    (v) => v === null || z.url().safeParse(v).success,
    { message: "Enter a valid URL." },
  ),
  tags: z
    .array(z.string())
    .default([])
    // Trim, drop empties, and dedupe so the join table stays clean — the
    // transform is the cleaner, so any stray empty strings are tolerated.
    .transform((tags) =>
      Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))),
    ),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
