# AI Auto-Tagging

## Overview

Add AI-powered tag suggestions for items using Google Gemini (`gemini-2.5-flash-lite`). Users click a "Suggest Tags" button in the tags area, and the AI returns 3-5 freeform tag suggestions based on the item's title and content. Each suggestion has accept/reject controls. Pro-only feature with both UI-level and server-side gating. If this is the first AI feature implemented, it also establishes the Gemini foundation (client, server action, rate limit config) for subsequent AI features.

## Requirements

- Create Gemini client utility (`@google/genai`) with `AI_MODEL` constant set to `gemini-2.5-flash-lite` (if not already created by a prior AI feature)
- Use the `@google/genai` SDK and keep it simple. Do NOT use the legacy `@google/generative-ai` package
- Create `generateAutoTags` server action with auth, Pro gating, Zod validation, rate limiting
- Add AI rate limit config (20 requests/hour per user) to existing rate limit utility (if not already added)
  - Note: on Gemini's free tier the RPM/RPD quota is shared per-project across ALL users, so the per-user cap is a fairness guard, not the real ceiling — the server action must also handle `429 RESOURCE_EXHAUSTED` from Gemini gracefully (see gotchas)
- Add "Suggest Tags" button (Sparkles icon, ghost variant) near the tags input in create item dialog and item drawer edit mode
- Display suggested tags as badges with accept (check) and reject (X) controls per tag
- Accepted tags get added to the item's tag list
- Tags are freeform (not limited to existing tags in the database)
- Truncate content to 2000 chars before API call
- Hide the Suggest Tags button for free users (Pro-only UI gating)
- Error handling via toast (Pro gating, rate limit, AI service errors)
- Follow existing patterns
- Unit tests for server action

## CRITICAL: Gemini SDK (`@google/genai`) gotchas

### Use the current SDK, not the legacy one

There are two Google GenAI JS packages. Use **`@google/genai`** (current). The old **`@google/generative-ai`** (`GoogleGenerativeAI` / `getGenerativeModel`) is deprecated — LLM code assistants frequently suggest it, so reject that.

```typescript
// CORRECT — current @google/genai SDK
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-lite",
  contents: "Suggest 3-5 tags for this snippet...",
  config: {
    systemInstruction: "You are a developer tool assistant...",
    responseMimeType: "application/json",
  },
});
const text = response.text; // <-- content is on the `.text` accessor (NOT a function call)
```

### Key differences from the OpenAI spec this replaces

| OpenAI (old)                                | Gemini (`@google/genai`)                           |
| ------------------------------------------- | -------------------------------------------------- |
| `client.responses.create()`                 | `ai.models.generateContent()`                      |
| `instructions` (system) + `input` (user)    | `config.systemInstruction` + `contents` (user)     |
| `text: { format: { type: 'json_object' } }` | `config: { responseMimeType: 'application/json' }` |
| `response.output_text`                      | `response.text`                                    |
| `max_output_tokens`                         | `config.maxOutputTokens` (optional)                |

### Other gotchas

- `response.text` is an **accessor, not a method** — do not call it as `response.text()` (that was the legacy `@google/generative-ai` API and is a common mistake)
- For JSON output, set `config.responseMimeType: 'application/json'` and parse `response.text` manually. A strict `responseSchema` (via the `Type` enum) also works but its exact syntax shifts between SDK majors — keep it simple with `responseMimeType` + manual parse unless a schema is truly needed
- The model may return `{"tags": ["a", "b"]}` OR `["a", "b"]` — handle both formats
- Always normalize tags to lowercase after receiving them
- Handle `429 RESOURCE_EXHAUSTED` (free-tier quota exhausted) — surface a friendly toast and optionally retry with exponential backoff + jitter; never let it crash the action
- Verify the exact model ID and current free-tier RPM/RPD limits in Google AI Studio before shipping — free-tier model availability and quotas shift over time
- Because tags here are **freeform**, an LLM call is the correct approach. If a fixed tag taxonomy is introduced later, switch that path to embeddings + cosine similarity (a `text-embedding` model) — far cheaper and faster than an LLM call for closed-set classification

## Notes

- `GEMINI_API_KEY` in `.env` (server-only — no `NEXT_PUBLIC_` prefix); also add it to Vercel env vars for deployment
- Free-tier privacy: on the free tier Gemini may use inputs/outputs to improve its models. Item titles/content are sent to Google — acceptable for this project's data, but keep in mind if sensitive content is ever tagged
- `isPro` is available server-side via session but not passed to create/edit UI components — use server-side gating for enforcement, UI gating for button visibility requires passing `isPro` as a prop or fetching it client-side
- See `docs/ai-integration-plan.md` for full architectural context
