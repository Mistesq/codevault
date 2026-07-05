import "server-only";

import { isGeminiConfigured } from "@/lib/ai/client";
import { isRateLimitError } from "@/lib/ai/tagging";
import { PLAN_LIMIT_MESSAGES } from "@/lib/billing/plan";
import {
  checkRateLimit,
  RATE_LIMITS,
  retryAfterMessage,
} from "@/lib/rate-limit";

/** Friendly, retryable message when the Gemini provider quota is exhausted. */
export const AI_BUSY_ERROR = "AI is busy right now. Please try again shortly.";

/** Noun used in the per-user rate-limit copy, tuned per action. */
export type AiQuotaNoun = "suggestions" | "requests";

/**
 * Shared pre-flight guard for the AI actions: Pro gate → Gemini configured →
 * per-user rate limit on the shared `ai` bucket (the free-tier Gemini quota is a
 * project-wide budget, so we fairness-cap per user). Returns `{ ok: true }` when
 * the caller may proceed, otherwise a ready-to-surface failure message. The
 * `quotaNoun` tailors the rate-limit copy ("suggestions" vs "requests").
 */
export async function requireAiAccess(
  userId: string,
  isPro: boolean,
  quotaNoun: AiQuotaNoun = "requests",
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Pro gate — matches the UI gating; server-side is the real enforcement.
  if (!isPro) return { ok: false, error: PLAN_LIMIT_MESSAGES.ai };

  if (!isGeminiConfigured()) {
    return { ok: false, error: "AI is not configured." };
  }

  const limit = await checkRateLimit(RATE_LIMITS.ai, userId);
  if (!limit.success) {
    return {
      ok: false,
      error: `You've used your AI ${quotaNoun} for now. Try again in ${retryAfterMessage(limit.reset)}.`,
    };
  }

  return { ok: true };
}

/**
 * Map a thrown AI error to the action failure shape. Provider quota exhaustion
 * (429 / RESOURCE_EXHAUSTED) becomes the friendly, retryable `AI_BUSY_ERROR`;
 * anything else is logged under `logLabel` and returns `fallback`.
 */
export function mapAiError(
  error: unknown,
  logLabel: string,
  fallback: string,
): { success: false; error: string } {
  if (isRateLimitError(error)) {
    return { success: false, error: AI_BUSY_ERROR };
  }
  console.error(logLabel, error);
  return { success: false, error: fallback };
}
