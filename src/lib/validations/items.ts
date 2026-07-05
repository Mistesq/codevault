import { z } from "zod";
import { optionalTrimmed } from "@/lib/validations/shared";

// Item create/update payloads. The server actions are the source of truth —
// they validate this before touching the database.
//
// Optional text fields normalize empty/whitespace-only input to null so we
// don't persist empty strings (see `optionalTrimmed`). `content` is
// intentionally NOT trimmed: code and notes can have meaningful leading/trailing
// whitespace.

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

// Collection ids the item should belong to (many-to-many). Trim, drop empties,
// and dedupe; ownership is verified server-side before linking.
const collectionIdsField = z
  .array(z.string())
  .default([])
  .transform((ids) =>
    Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))),
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
  collectionIds: collectionIdsField,
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// Types the create dialog can choose. "URL" matches the system ItemType.name
// exactly (stored uppercase); "file"/"image" carry an uploaded R2 object rather
// than text content.
export const CREATE_ITEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "URL",
  "file",
  "image",
] as const;

export type CreateItemType = (typeof CREATE_ITEM_TYPES)[number];

// The file/image types store an uploaded object instead of text.
export const FILE_CREATE_TYPES = ["file", "image"] as const;

export const createItemSchema = z
  .object({
    type: z.enum(CREATE_ITEM_TYPES),
    title: z.string().trim().min(1, "Title is required."),
    description: optionalTrimmed,
    content: contentField,
    language: optionalTrimmed,
    url: optionalTrimmed,
    // File metadata, set only for the file/image types (uploaded beforehand).
    fileUrl: optionalTrimmed,
    fileName: optionalTrimmed,
    fileSize: z.number().int().positive().nullish().transform((v) => v ?? null),
    tags: tagsField,
    collectionIds: collectionIdsField,
  })
  .superRefine((data, ctx) => {
    if (data.type === "URL") {
      // URL items require a valid URL.
      if (!data.url) {
        ctx.addIssue({ code: "custom", path: ["url"], message: "URL is required." });
      } else if (!z.url().safeParse(data.url).success) {
        ctx.addIssue({ code: "custom", path: ["url"], message: "Enter a valid URL." });
      }
      return;
    }

    if ((FILE_CREATE_TYPES as readonly string[]).includes(data.type)) {
      // File/image items require the uploaded file's metadata.
      if (!data.fileUrl || !data.fileName || data.fileSize === null) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: "Please upload a file.",
        });
      } else if (!z.url().safeParse(data.fileUrl).success) {
        // Must be a real URL. The server also verifies it points at our own R2
        // bucket (see createItem) so a forged external URL can't be persisted.
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: "Invalid file URL.",
        });
      }
    }
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;
