import { z } from "zod";

// Field builders shared across the validation schemas so the same normalization
// rules aren't redefined (and allowed to drift) per feature.

/**
 * Optional text field: trims, then normalizes empty/whitespace-only/missing
 * input to `null` so we never persist empty strings. Output type is
 * `string | null`.
 */
export const optionalTrimmed = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));
