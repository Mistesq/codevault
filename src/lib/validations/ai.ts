import { z } from "zod";
import { optionalTrimmed } from "@/lib/validations/shared";

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

// Input payload for the AI description action. Every field is optional and
// normalized to a trimmed string or null (see `optionalTrimmed`), but
// `superRefine` requires at least one substantive signal (title, content, or
// url) so we never ask the model to describe an empty item. `type`/`language`
// add context but don't count as standalone signal.
export const describeItemSchema = z
  .object({
    title: optionalTrimmed,
    content: optionalTrimmed,
    type: optionalTrimmed,
    url: optionalTrimmed,
    language: optionalTrimmed,
  })
  .superRefine((data, ctx) => {
    if (!data.title && !data.content && !data.url) {
      ctx.addIssue({
        code: "custom",
        message: "Add a title or some content first to generate a description.",
      });
    }
  });

export type DescribeItemInput = z.infer<typeof describeItemSchema>;

// Input payload for the AI code-explanation action. Content is required (it's
// the code/command being explained); language/type add context but are optional.
export const explainCodeSchema = z.object({
  content: z.string().trim().min(1, "There's no code to explain."),
  language: optionalTrimmed,
  type: optionalTrimmed,
});

export type ExplainCodeInput = z.infer<typeof explainCodeSchema>;

// Input payload for the AI prompt-optimization action. Content is required (it's
// the prompt being refined); no other context is needed.
export const optimizePromptSchema = z.object({
  content: z.string().trim().min(1, "There's no prompt to optimize."),
});

export type OptimizePromptInput = z.infer<typeof optimizePromptSchema>;
