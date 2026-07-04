import { z } from "zod";

// Input payload for the AI auto-tagging action. The server action is the source
// of truth — it validates this before calling Gemini. Title is required (it's
// the primary signal); content is optional and gets truncated downstream.

export const autoTagSchema = z.object({
  title: z.string().trim().min(1, "A title is required to suggest tags."),
  content: z
    .string()
    .nullish()
    .transform((v) => (v && v.trim().length > 0 ? v : null)),
});

export type AutoTagInput = z.infer<typeof autoTagSchema>;
