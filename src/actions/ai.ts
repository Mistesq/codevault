"use server";

import { NOT_SIGNED_IN_ERROR, requireSessionUser } from "@/lib/actions/session";
import { type ActionResult, parseActionInput } from "@/lib/actions/result";
import { AI_MODEL, EXPLAIN_MODEL, getGemini } from "@/lib/ai/client";
import { mapAiError, requireAiAccess } from "@/lib/ai/guard";
import {
  buildTaggingPrompt,
  parseTagSuggestions,
  TAGGING_SYSTEM_INSTRUCTION,
} from "@/lib/ai/tagging";
import {
  buildDescriptionPrompt,
  DESCRIPTION_SYSTEM_INSTRUCTION,
  parseDescription,
} from "@/lib/ai/description";
import { buildExplainPrompt, EXPLAIN_SYSTEM_INSTRUCTION } from "@/lib/ai/explain";
import {
  buildOptimizePrompt,
  OPTIMIZE_SYSTEM_INSTRUCTION,
  parseOptimizedPrompt,
} from "@/lib/ai/optimize";
import {
  autoTagSchema,
  describeItemSchema,
  explainCodeSchema,
  optimizePromptSchema,
} from "@/lib/validations/ai";

// Streaming variant: pre-flight checks resolve synchronously to an error, but a
// successful call hands back a text stream the client reads token-by-token.
type StreamResult =
  | { success: true; stream: ReadableStream<string> }
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
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  const access = await requireAiAccess(user.id, user.isPro, "suggestions");
  if (!access.ok) return { success: false, error: access.error };

  const parsed = parseActionInput(autoTagSchema, input);
  if (!parsed.success) return parsed;

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
    return mapAiError(
      error,
      "Generate auto tags failed:",
      "Something went wrong generating tags. Please try again.",
    );
  }
}

/**
 * Generate a concise 1-2 sentence description for an item from whatever fields
 * the user has entered so far (no save required). Mirrors `generateAutoTags`:
 * Pro-only (server-side enforcement), rate-limited per user on the shared AI
 * bucket, and Zod-validated. Never throws to the caller — provider quota errors
 * (429 / RESOURCE_EXHAUSTED) and other AI failures map to a friendly message.
 */
export async function generateDescription(
  input: unknown,
): Promise<ActionResult<string>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  const access = await requireAiAccess(user.id, user.isPro, "suggestions");
  if (!access.ok) return { success: false, error: access.error };

  const parsed = parseActionInput(describeItemSchema, input);
  if (!parsed.success) return parsed;

  try {
    const response = await getGemini().models.generateContent({
      model: AI_MODEL,
      contents: buildDescriptionPrompt({
        title: parsed.data.title,
        typeLabel: parsed.data.type,
        content: parsed.data.content,
        url: parsed.data.url,
        language: parsed.data.language,
      }),
      config: {
        systemInstruction: DESCRIPTION_SYSTEM_INSTRUCTION,
        // Thinking off keeps generation fast and cheap.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const description = parseDescription(response.text);
    if (!description) {
      return {
        success: false,
        error:
          "Couldn't generate a description for this item. Try adding more detail.",
      };
    }
    return { success: true, data: description };
  } catch (error) {
    return mapAiError(
      error,
      "Generate description failed:",
      "Something went wrong generating the description. Please try again.",
    );
  }
}

/**
 * Explain a code snippet or command via Gemini, streaming the markdown result
 * token-by-token for a responsive UI. Uses the reasoning-tier `EXPLAIN_MODEL`
 * (stronger than the tagging/description default). Mirrors the other AI actions'
 * guards — Pro-only (server-side enforcement), rate-limited per user on the
 * shared `ai` bucket, and Zod-validated. Pre-flight failures resolve to a
 * friendly `{ success: false }`; once the stream opens, mid-stream provider
 * errors are logged and end the stream (partial content is kept).
 */
export async function explainCode(input: unknown): Promise<StreamResult> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  // Explanations aren't cached server-side, so every click is a fresh call —
  // the rate limit stops repeated re-clicks from draining the shared quota.
  const access = await requireAiAccess(user.id, user.isPro, "requests");
  if (!access.ok) return { success: false, error: access.error };

  const parsed = parseActionInput(explainCodeSchema, input);
  if (!parsed.success) return parsed;

  try {
    // Awaiting here surfaces an initial 429 / RESOURCE_EXHAUSTED (the common
    // failure) before we commit to a stream, so it maps to a friendly message.
    const response = await getGemini().models.generateContentStream({
      model: EXPLAIN_MODEL,
      contents: buildExplainPrompt({
        content: parsed.data.content,
        language: parsed.data.language,
        typeLabel: parsed.data.type,
      }),
      config: {
        systemInstruction: EXPLAIN_SYSTEM_INSTRUCTION,
        // Thinking off keeps time-to-first-token low for the streaming UI; the
        // stronger base model still lifts explanation quality.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const stream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) controller.enqueue(text);
          }
        } catch (error) {
          // Mid-stream failure is rare; keep whatever streamed and close.
          console.error("Explain code stream failed:", error);
        } finally {
          controller.close();
        }
      },
    });

    return { success: true, stream };
  } catch (error) {
    return mapAiError(
      error,
      "Explain code failed:",
      "Something went wrong explaining this code. Please try again.",
    );
  }
}

/**
 * Refine a prompt item's content via Gemini, returning the improved prompt so the
 * UI can show it and let the user accept (save) or discard it. Uses the
 * reasoning-tier `EXPLAIN_MODEL` (refinement quality benefits from it). Mirrors
 * the other AI actions' guards — Pro-only (server-side enforcement), rate-limited
 * per user on the shared `ai` bucket, and Zod-validated. Never throws to the
 * caller: provider quota errors (429 / RESOURCE_EXHAUSTED) and other AI failures
 * map to a friendly message.
 */
export async function optimizePrompt(
  input: unknown,
): Promise<ActionResult<string>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  const access = await requireAiAccess(user.id, user.isPro, "requests");
  if (!access.ok) return { success: false, error: access.error };

  const parsed = parseActionInput(optimizePromptSchema, input);
  if (!parsed.success) return parsed;

  try {
    const response = await getGemini().models.generateContent({
      model: EXPLAIN_MODEL,
      contents: buildOptimizePrompt({ content: parsed.data.content }),
      config: {
        systemInstruction: OPTIMIZE_SYSTEM_INSTRUCTION,
        // Thinking off keeps the refinement fast; the stronger base model still
        // lifts quality.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const optimized = parseOptimizedPrompt(response.text);
    if (!optimized) {
      return {
        success: false,
        error: "Couldn't optimize this prompt. Please try again.",
      };
    }
    return { success: true, data: optimized };
  } catch (error) {
    return mapAiError(
      error,
      "Optimize prompt failed:",
      "Something went wrong optimizing this prompt. Please try again.",
    );
  }
}
