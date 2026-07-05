import { z } from "zod";

/**
 * Standard Server Action result shape (coding standards' `{ success, data,
 * error }` pattern). Shared so every action file references one canonical type
 * instead of redeclaring it.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Validate `input` against a Zod schema, collapsing the repeated
 * safeParse → first-issue-message → fallback boilerplate that every mutation
 * action shares. On failure it returns the action pattern's failure branch
 * directly, so callers can simply `return parsed` (it's assignable to any
 * `ActionResult<T>` / stream failure result). On success `parsed.data` carries
 * the schema's inferred output type.
 */
export function parseActionInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
  fallback = "Invalid details.",
): { success: true; data: z.infer<S> } | { success: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? fallback,
    };
  }
  return { success: true, data: parsed.data };
}
