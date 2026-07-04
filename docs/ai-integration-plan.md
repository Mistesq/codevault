# AI Integration Plan — Google Gemini (`@google/genai`)

> Research doc. Scope: how to wire Google Gemini into CodeVault for **auto-tagging**,
> **AI summaries**, **explain code**, and **prompt optimization**, using the current
> `@google/genai` SDK and the project's existing server-action / Pro-gating patterns.
> This is documentation only — no code has been changed.

---

## 0. TL;DR / Recommendations

- **SDK**: use `@google/genai` (`GoogleGenAI` class, `ai.models.generateContent*`).
  **Do NOT** use the deprecated `@google/generative-ai` (`GoogleGenerativeAI` /
  `getGenerativeModel`) — LLM assistants keep suggesting it; it is the wrong package.
- **Client module**: one **server-only, lazy-singleton** module
  `src/lib/ai/client.ts`, mirroring `src/lib/stripe/client.ts` and `src/lib/r2.ts`
  (`getGemini()` + `isGeminiConfigured()`).
- **Models**:
  - Route auto-tagging + summaries to **`gemini-2.5-flash-lite`** (cheapest, highest
    free RPD, thinking OFF for speed).
  - Route explain-code + prompt-optimization to **`gemini-2.5-flash`** (or current
    **`gemini-3-flash`**) with **streaming**.
- **Auto-tagging**: start with a **single structured-output call** (JSON via
  `responseMimeType: "application/json"` + `responseJsonSchema`). Only reach for
  embeddings + cosine similarity if/when tags become a large *fixed* set (see §5).
- **Gating**: AI is **Pro-only** per the spec. Reuse `PlanLimitError` /
  `PLAN_LIMIT_MESSAGES` from `src/lib/billing/plan.ts` — add an `"ai"` resource.
- **Rate limiting**: the binding free-tier constraint is **RPM/RPD, not dollars**.
  Reuse the Upstash sliding-window limiter (`src/lib/rate-limit.ts`) with a
  **per-user** AI bucket, and handle `429 RESOURCE_EXHAUSTED` with
  **exponential backoff + jitter**.
- **Privacy**: on the **free tier Google may use inputs/outputs to improve its
  models** and humans may review them. Gate/what-you-send accordingly (see §12).
- **Abstraction**: hide the provider behind `generateText()` / `generateJSON()` /
  `streamText()` so a second free tier (e.g. Groq) can be a fallback when the
  Gemini daily quota is exhausted (see §11).

---

## 1. Models & current free-tier limits

> ⚠️ **Verify in AI Studio before finalizing.** The official rate-limits page
> ([ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits))
> no longer publishes fixed numbers — it says limits "depend on your usage tier and
> can be viewed in Google AI Studio" → **[aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit)**.
> Free-tier model availability and quotas shifted after the Dec 2025 adjustments.
> The numbers below are the best current community/aggregator figures (mid-2026) and
> should be treated as approximate.

| Model | Role in CodeVault | Approx. free RPM | Approx. free RPD | Notes |
| --- | --- | --- | --- | --- |
| `gemini-2.5-flash-lite` | Auto-tagging, summaries | ~15 | ~1,000 | Cheapest; disable thinking (`thinkingBudget: 0`) for latency |
| `gemini-2.5-flash` | Explain code, prompt opt. | ~10 | ~250–1,500 | Better reasoning; stream it |
| `gemini-3-flash` | Newer recommended free model | ~10 | ~1,500 (250k TPM) | Google's "recommended" free model in early 2026; candidate escalation target |
| `gemini-3.1-flash-lite` | Newer lite tier | ~15 | ~1,000 | Separate RPD bucket from 2.5 |

Key operational facts (confirm live):

- **RPD resets at midnight Pacific.**
- **Limits are per *project*, not per API key** — spinning up more keys does **not**
  add quota. Plan around one project's shared daily budget.
- Free access is currently limited to the Flash / Flash-Lite family (no Pro on free).

**Decision for this project**: pin two model IDs in config/env so they can be bumped
without code changes:

```
GEMINI_MODEL_LITE=gemini-2.5-flash-lite      # tagging + summaries
GEMINI_MODEL_FLASH=gemini-2.5-flash          # explain + prompt-opt (or gemini-3-flash)
```

---

## 2. SDK setup & the client module

Install: `npm i @google/genai`.

Add env keys (server-only — **no `NEXT_PUBLIC_` prefix**):

```bash
# Google Gemini (key from Google AI Studio)
GEMINI_API_KEY=
GEMINI_MODEL_LITE=gemini-2.5-flash-lite
GEMINI_MODEL_FLASH=gemini-2.5-flash
```

`src/lib/ai/client.ts` — lazy singleton + config guard, matching the house pattern
(`stripe/client.ts`, `r2.ts`, `email/resend.ts`):

```ts
import "server-only";
import { GoogleGenAI } from "@google/genai";

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

export const AI_MODELS = {
  lite: process.env.GEMINI_MODEL_LITE ?? "gemini-2.5-flash-lite",
  flash: process.env.GEMINI_MODEL_FLASH ?? "gemini-2.5-flash",
} as const;
```

Basic call shape (current SDK — note `ai.models.generateContent`, **not** the legacy
`getGenerativeModel().generateContent`):

```ts
const ai = getGemini();
const res = await ai.models.generateContent({
  model: AI_MODELS.lite,
  contents: "Why is the sky blue?",
  config: { thinkingConfig: { thinkingBudget: 0 } }, // off = faster/cheaper
});
console.log(res.text);
```

---

## 3. Where the code lives (fits coding-standards)

Follow the existing separation rules (`context/coding-standards.md`): components render,
`src/lib` holds domain logic, `src/actions` holds mutations, all server-only.

```
src/lib/ai/
  client.ts          # getGemini(), isGeminiConfigured(), AI_MODELS  (server-only)
  provider.ts        # generateText/generateJSON/streamText abstraction (§11)
  backoff.ts         # exponential backoff + jitter, 429 detection (§10)
  prompts.ts         # prompt builders per feature (pure, testable)
  tagging.ts         # buildTaggingRequest + parse/validate result
  summary.ts
  explain.ts
  prompt-optimize.ts
src/lib/validations/ai.ts   # Zod schemas for action inputs + parsed AI output
src/actions/ai.ts           # server actions: autoTagItem, summarizeItem, explainCode, optimizePrompt
src/app/api/ai/explain/route.ts   # streaming route(s) for interactive features
```

- **Pure prompt builders + output parsers in `src/lib/ai/*`** → unit-testable per the
  Testing rules (mock `@/lib/ai/client`, never hit the network).
- **Server actions** for deferred/one-shot features (tagging, summaries).
- **Route handlers** for streaming (explain code, prompt optimization) — see §4.

---

## 4. Streaming vs non-streaming

| Feature | Latency tolerance | Transport | SDK method |
| --- | --- | --- | --- |
| Auto-tagging | Deferred / queueable | Server Action, non-streaming | `generateContent` (JSON) |
| AI summary | Deferred / queueable | Server Action, non-streaming | `generateContent` |
| Explain code | Interactive | **Streaming** | `generateContentStream` |
| Prompt optimization | Interactive | **Streaming** | `generateContentStream` |

**Non-streaming (actions)** — one-shot, returns the `{ success, data, error }` shape.

**Streaming** — Server Actions don't stream token-by-token cleanly; use a **Route
Handler** returning a `ReadableStream` and consume it on the client. Shape:

```ts
// src/app/api/ai/explain/route.ts  (Node runtime)
export async function POST(req: Request) {
  // 1. auth() + Pro gate + per-user rate-limit (see §8, §10) → 401/402/429 as needed
  // 2. validate body with Zod
  const stream = await getGemini().models.generateContentStream({
    model: AI_MODELS.flash,
    contents: buildExplainPrompt(code, language),
  });
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

Client reads `response.body.getReader()` and appends chunks to state for a live
"typing" UX. (Per coding-standards, streaming/long-running work is exactly the case
where an **API route** is preferred over a Server Action.)

---

## 5. Auto-tagging — two approaches

### Option A — Structured-output LLM call (recommended start)

One `generateContent` call to `flash-lite` with enforced JSON schema:

```ts
import { Type } from "@google/genai";

const res = await getGemini().models.generateContent({
  model: AI_MODELS.lite,
  contents: buildTaggingPrompt(title, content, language),
  config: {
    thinkingConfig: { thinkingBudget: 0 },
    responseMimeType: "application/json",
    responseJsonSchema: {
      type: Type.OBJECT,
      properties: {
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3–6 lowercase, single-or-hyphenated topic tags",
        },
      },
      propertyOrdering: ["tags"],
    },
  },
});
const { tags } = JSON.parse(res.text); // guaranteed valid JSON per schema
```

- **Pros**: handles free/dynamic tags, no vocabulary to maintain, one call.
- **Cons**: costs one LLM request per tagging (RPM/RPD pressure); still validate
  output with Zod (cap count, normalize case, dedupe, strip empties) before writing.
- **Always re-validate** — structured output constrains shape, not your business rules.

### Option B — Embeddings + cosine similarity (only if tags are a fixed set)

1. Pre-embed a **fixed tag vocabulary** once (`embedContent`, model
   `text-embedding-004` or newer `gemini-embedding-*`), store vectors.
2. At tag-time, embed the item content once, compute cosine similarity vs each tag
   vector, take top-N over a threshold.

```ts
const res = await getGemini().models.embedContent({
  model: "text-embedding-004",
  contents: itemText,
  config: { outputDimensionality: 256 }, // smaller = cheaper compare/storage
});
const vector = res.embeddings?.[0]?.values;
```

- **Pros**: far cheaper/faster; embedding calls are lighter than generation; great when
  the tag set is predefined and stable.
- **Cons**: can only ever return tags from the fixed vocabulary; needs a vector store
  or in-memory compare + a maintained tag list.

**Verdict**: CodeVault tags are **user-defined and free-form** today (`Tag` model,
`@@unique([userId, name])`), so **Option A** fits now. Revisit Option B only if we
introduce a curated global tag taxonomy.

---

## 6. Realtime vs deferred split (app-level queueing)

> ⚠️ The Gemini **free tier has no discounted Batch API**. "Batching" here means
> **app-level queueing** to respect RPM — not a paid batch endpoint.

| Feature | Mode | Strategy |
| --- | --- | --- |
| Auto-tag, Summary | **Deferred** | Can run after save / on demand; queue to stay under RPM. Combine multiple items per request where possible to cut call count. |
| Explain code, Prompt-opt | **Realtime** | User is waiting → stream immediately; count against per-user RPM bucket. |

For deferred work, a lightweight in-process queue that spaces calls to honor RPM is
enough at this scale — no need for a job runner yet. If tagging is offered as a
"tag all my items" bulk action, **chunk multiple items into one prompt** (structured
output returning `[{ itemId, tags }]`) to spend one request for many items.

---

## 7. Error handling & rate limiting

### 7a. Provider errors (`429 RESOURCE_EXHAUSTED`)

Gemini returns `429` when RPM/RPD/TPM is exceeded. Wrap every call in
**exponential backoff with jitter**, capped retries, and give up gracefully:

```ts
// src/lib/ai/backoff.ts
export async function withBackoff<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (!isRetryable(err) || attempt >= tries) throw err;
      const base = 500 * 2 ** (attempt - 1);       // 0.5s, 1s, 2s…
      const jitter = Math.random() * base;          // full jitter
      await new Promise((r) => setTimeout(r, base + jitter));
    }
  }
}
// isRetryable → status 429 or 5xx (RESOURCE_EXHAUSTED / UNAVAILABLE)
```

- On exhausted retries: return the `{ success: false, error }` action shape with a
  friendly "AI is busy, try again shortly" message (mirror the existing action error
  copy in `src/actions/items.ts`).
- If the API surfaces `retryDelay`, prefer it over the computed backoff.

### 7b. App-level per-user rate limiting

Independently of provider limits, protect the **shared** daily project quota so one
user can't exhaust it. Reuse the Upstash sliding-window limiter
(`src/lib/rate-limit.ts`) — add an AI entry to `RATE_LIMITS`:

```ts
// add to RATE_LIMITS in src/lib/rate-limit.ts
ai: { limit: 20, window: "1 h", prefix: "ai" },   // per-user, tune to taste
```

Key the limiter by **user id** (`checkRateLimit(RATE_LIMITS.ai, userId)`), not IP, so
it tracks the account. It already **fails open** if Upstash is unconfigured. For API
routes, reuse `tooManyRequestsResponse(reset)`; for actions, return a friendly error.

---

## 8. Pro-user gating

The spec makes AI **Pro-only**. Reuse the existing plan machinery in
`src/lib/billing/plan.ts` rather than inventing a parallel check:

1. Add `"ai"` to `PlanLimitResource` and a message to `PLAN_LIMIT_MESSAGES`:

   ```ts
   export type PlanLimitResource = "item" | "collection" | "file" | "image" | "ai";
   // …
   ai: "AI features are a Pro feature. Upgrade to Pro to use AI.",
   ```

2. Gate every AI entry point with the **auth + Pro** pattern already used across
   actions. `isPro` is on the session (JWT `jwt()` re-reads it) and on `User`:

   ```ts
   const session = await auth();
   if (!session?.user) return { success: false, error: "You must be signed in." };
   if (!session.user.isPro) throw new PlanLimitError("ai");   // → PLAN_LIMIT_MESSAGES
   if (!isGeminiConfigured()) return { success: false, error: "AI is not configured." };
   ```

3. Actions catch `PlanLimitError` and map to `PLAN_LIMIT_MESSAGES[error.resource]`
   (identical to `createItem`), so the UI can show the upgrade CTA and route to
   `/upgrade`. For the streaming **API route**, return **402** for non-Pro (mirrors
   the `/api/upload` 402 pattern).

---

## 9. Quota / cost optimization

On free tier the constraint is **request count**, not spend:

- **Minimize calls**: batch multiple items per request for bulk tagging/summarizing
  (one structured-output call returning an array).
- **Dedupe**: skip re-tagging/re-summarizing unchanged content — hash the input and
  cache the result (store `aiSummary`/generated tags on the item; only regenerate on
  content change or explicit user action).
- **Right-size the model**: route everything simple to `flash-lite`; reserve `flash`
  for genuine reasoning (explain / optimize).
- **Turn thinking off** (`thinkingConfig.thinkingBudget: 0`) for tagging/summaries —
  lower latency and token use.
- **Queue non-urgent work** to spread across the RPM window.
- **Context caching** for a repeated static prefix (system prompt + tag schema) is
  mostly relevant on the **paid tier / under TPM pressure**; not a day-one need on free.

---

## 10. Fallback provider strategy (provider-agnostic interface)

Wrap the provider so the daily-quota-exhausted case can fall back to a second free
tier (e.g. **Groq**) without touching feature code:

```ts
// src/lib/ai/provider.ts (server-only)
export interface AiProvider {
  generateText(opts: { model: "lite" | "flash"; prompt: string }): Promise<string>;
  generateJSON<T>(opts: { model: "lite" | "flash"; prompt: string; schema: unknown }): Promise<T>;
  streamText(opts: { model: "lite" | "flash"; prompt: string }): Promise<AsyncIterable<string>>;
}
```

- Default impl calls Gemini via `getGemini()`.
- On `429 RESOURCE_EXHAUSTED` **after backoff is exhausted** (daily quota gone), the
  wrapper can try the fallback provider (feature-flagged; off unless configured).
- Feature code depends only on `generateText/generateJSON/streamText` — swapping or
  adding providers is a config change, not a refactor.

Keep this behind an env flag so the fallback is optional and disabled by default.

---

## 11. UI patterns

- **Loading states**: skeleton/spinner in the button; disable while in flight. For
  streaming, show tokens live ("typing" effect) via the reader loop (§4).
- **Accept / reject suggestions**: AI output is a **proposal**, not an auto-commit.
  - *Tags*: show suggested tags as toggleable chips; user confirms which to add before
    they're persisted (append to the item's existing tags; respect `@@unique`).
  - *Summary*: show in a preview panel with **Insert / Regenerate / Dismiss**.
  - *Explain code*: render into the drawer as read-only markdown (reuse the existing
    `MarkdownEditor` preview / `.markdown-preview` styling).
  - *Prompt optimization*: show original vs optimized side-by-side; **Copy** / **Replace**.
- **Errors**: surface action errors via the existing **sonner** toast pattern.
- **Empty/misconfig**: when `isGeminiConfigured()` is false, hide AI affordances (don't
  render dead buttons).
- **Entry points**: the item drawer action bar is the natural home (next to Copy/Pin);
  "New Prompt" flow is the natural home for prompt optimization.

---

## 12. Security & data privacy

**API key handling**

- Server-only: `GEMINI_API_KEY`, **never** `NEXT_PUBLIC_`. Keep in `.env.local`
  locally and add to **Vercel env vars** for deploys. The `client.ts` module carries
  `import "server-only"` so it can't be imported into a client bundle.
- All Gemini calls originate from Server Actions / Route Handlers — the key never
  reaches the browser.

**Input sanitization / prompt-injection**

- Treat item content as **untrusted**. Keep the system/instruction prompt separate
  from user content; don't let content redefine the task.
- Validate action inputs with **Zod** (`src/lib/validations/ai.ts`) and **re-validate
  AI output** (cap tag count/length, normalize, dedupe) before writing to the DB.
- Enforce input size caps to bound token usage and abuse.

**Data privacy — ⚠️ free-tier caveat**

- On the **free/unpaid Gemini API tier, Google may use your inputs and outputs to
  improve its products, and human reviewers may see them.** On the **paid tier**,
  Google states prompts/responses are **not** used for training/product improvement.
  (EEA/Switzerland/UK: the paid-tier data terms apply even to free usage.)
- Implication for CodeVault: flag features that could send **sensitive** data —
  **private user notes** and **third-party/proprietary code** — as risky on free tier.
  Options: (a) require the paid Gemini tier before enabling AI on private content,
  (b) show an explicit consent notice for AI on notes/snippets, and/or (c) restrict
  AI to explicitly opted-in items. Decide this before shipping AI on the free tier.

---

## 13. Testing (per project rules)

Unit tests cover **`src/lib/ai/*` and `src/actions/ai.ts`** only (no UI tests), with
**no real network** — `vi.mock("@/lib/ai/client", …)`, `vi.mock("@/auth", …)`:

- `prompts.ts` — prompt builders produce expected strings for each type.
- `tagging.ts` — output parser caps count, lowercases, dedupes, drops empties; rejects
  malformed JSON.
- `backoff.ts` — retries on 429/5xx, gives up after N, respects non-retryable errors.
- `ai.ts` actions — auth guard, Pro gate (`PlanLimitError` → message), configured
  guard, `{ success, data, error }` shape, rate-limit path.

Run `npm test` + `npm run build` before committing (workflow rule).

---

## 14. Open decisions

- **Which escalation model**: stay on `gemini-2.5-flash` or move explain/optimize to
  `gemini-3-flash`? Confirm both are on the free tier + quotas in AI Studio.
- **Free-tier privacy stance**: block AI on private notes/code, gate behind paid
  Gemini, or consent-gate? (§12) — must decide before enabling AI on free tier.
- **Fallback provider**: ship Groq fallback now or leave the interface stubbed?
- **Persist generated summaries/tags**: add an `aiSummary` column + cache tags to avoid
  re-generation (schema change) vs recompute on demand.
- **Bulk tagging**: offer "tag all items", and if so, batch N-per-request.

---

## Sources

- Google Gen AI JS SDK (`@google/genai`) — Context7 `/googleapis/js-genai`
  (generateContent, generateContentStream, structured output `responseMimeType` /
  `responseJsonSchema` / `Type`, `embedContent`, `thinkingConfig.thinkingBudget`).
- [Rate limits | Gemini API](https://ai.google.dev/gemini-api/docs/rate-limits) →
  [AI Studio Rate Limit dashboard](https://aistudio.google.com/rate-limit)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) ·
  [Billing](https://ai.google.dev/gemini-api/docs/billing)
- Free-tier limit aggregators (approximate, verify live):
  [pecollective](https://pecollective.com/tools/gemini-free-tier-guide/) ·
  [tokenmix](https://tokenmix.ai/blog/gemini-api-free-tier-limits) ·
  [aifreeapi](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-complete-guide)
- Free-tier data-use policy:
  [Meetily — Gemini data retention 2026](https://meetily.ai/llm-privacy/gemini) ·
  [BSWEN — free-tier data privacy](https://docs.bswen.com/blog/2026-03-23-gemini-free-tier-data-privacy/)
- Codebase patterns: `src/lib/stripe/client.ts`, `src/lib/r2.ts`,
  `src/lib/rate-limit.ts`, `src/lib/billing/plan.ts`, `src/actions/items.ts`,
  `context/coding-standards.md`.
