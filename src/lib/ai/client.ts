import "server-only";

import { GoogleGenAI } from "@google/genai";

// Lazy-singleton Gemini client + config guard, matching the house pattern
// (`stripe/client.ts`, `r2.ts`, `email/resend.ts`): the client is built on first
// use so a missing key never crashes import, and callers can gate on
// `isGeminiConfigured()` before invoking.

/** The model used for auto-tagging (and other lightweight AI features). */
export const AI_MODEL = "gemini-2.5-flash-lite" as const;

/**
 * The reasoning-tier model used for code explanation. Stronger than the
 * `flash-lite` default — explanation quality benefits from it. If the `flash`
 * free-tier daily quota proves too tight, fall back to `AI_MODEL`.
 */
export const EXPLAIN_MODEL = "gemini-2.5-flash" as const;

let cached: GoogleGenAI | null = null;

/** True only when the API key is present, so callers can gate before invoking. */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Lazily instantiate the Gemini client; throws if the key is missing. */
export function getGemini(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  cached = new GoogleGenAI({ apiKey });
  return cached;
}
