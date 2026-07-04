"use server";

import { auth } from "@/auth";
import { AI_MODEL, getGemini, isGeminiConfigured } from "@/lib/ai/client";
import {
  buildTaggingPrompt,
  isRateLimitError,
  parseTagSuggestions,
  TAGGING_SYSTEM_INSTRUCTION,
} from "@/lib/ai/tagging";
import { PLAN_LIMIT_MESSAGES } from "@/lib/billing/plan";
import {
  checkRateLimit,
  RATE_LIMITS,
  retryAfterMessage,
} from "@/lib/rate-limit";
import { autoTagSchema } from "@/lib/validations/ai";

// Coding standards' action pattern: { success, data, error }.
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Suggest 3-5 freeform tags for an item via Gemini. Pro-only (server-side
 * enforcement mirrors the UI gating), rate-limited per user (the shared Gemini
 * free-tier quota is a project-wide budget), and Zod-validated. Never throws to
 * the caller: provider quota errors (429 / RESOURCE_EXHAUSTED) and other AI
 * failures map to a friendly message so the UI can toast it.
 */
export async function generateAutoTags(
  input: unknown,
): Promise<ActionResult<string[]>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

  // Pro gate — matches the UI gating; server-side is the real enforcement.
  if (!session.user.isPro) {
    return { success: false, error: PLAN_LIMIT_MESSAGES.ai };
  }

  if (!isGeminiConfigured()) {
    return { success: false, error: "AI is not configured." };
  }

  const parsed = autoTagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  // Per-user fairness guard on the shared project quota.
  const limit = await checkRateLimit(RATE_LIMITS.ai, session.user.id);
  if (!limit.success) {
    return {
      success: false,
      error: `You've used your AI suggestions for now. Try again in ${retryAfterMessage(limit.reset)}.`,
    };
  }

  try {
    const response = await getGemini().models.generateContent({
      model: AI_MODEL,
      contents: buildTaggingPrompt(parsed.data),
      config: {
        systemInstruction: TAGGING_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // Thinking off keeps tagging fast and cheap.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const tags = parseTagSuggestions(response.text);
    if (tags.length === 0) {
      return {
        success: false,
        error: "Couldn't suggest tags for this item. Try adding more detail.",
      };
    }
    return { success: true, data: tags };
  } catch (error) {
    // Provider quota exhausted — surface a friendly, retryable message.
    if (isRateLimitError(error)) {
      return {
        success: false,
        error: "AI is busy right now. Please try again shortly.",
      };
    }
    console.error("Generate auto tags failed:", error);
    return {
      success: false,
      error: "Something went wrong generating tags. Please try again.",
    };
  }
}
