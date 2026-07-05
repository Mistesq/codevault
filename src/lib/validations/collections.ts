import { z } from "zod";
import { optionalTrimmed } from "@/lib/validations/shared";

// Collection create payload. The server action is the source of truth — it
// validates this before touching the database.
//
// `description` is optional: empty/whitespace-only input normalizes to null so
// we don't persist empty strings (mirrors the item schema's optional fields).

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  description: optionalTrimmed,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// Edit dialog payload — same editable metadata as create (name + description).
export const updateCollectionSchema = createCollectionSchema;

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
