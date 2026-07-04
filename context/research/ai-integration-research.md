# AI Integration Research

## Output

docs/ai-integration-plan.md

## Research

Investigate best practices for integrating Google Gemini (via the `@google/genai` SDK) into a Next.js application for the following features:

- Auto-tagging content
- AI-generated summaries
- Code explanation
- Prompt optimization

## Model selection

- Primary: `gemini-2.5-flash-lite` — cheapest tier with the highest free-tier daily request quota; use for auto-tagging and summaries
- Escalation: `gemini-2.5-flash` (or the current 3.x Flash) — for code explanation and prompt optimization, where reasoning quality matters more
- Confirm exact model IDs and current free-tier RPM/RPD/TPM limits in Google AI Studio before finalizing — free-tier model availability and quotas shifted after the Dec 2025 adjustments
- Use the current `@google/genai` SDK. Do NOT use the legacy `@google/generative-ai` package (`GoogleGenerativeAI` / `getGenerativeModel`), which is deprecated; LLM code assistants frequently suggest it

## Include

- Gemini SDK setup and configuration: `@google/genai`, `GEMINI_API_KEY` env var, single server-only client module
- Server action patterns for AI calls
- Streaming vs non-streaming responses: `generateContentStream` for interactive code explanation; plain `generateContent` for tagging/summaries
- Auto-tagging approach — compare two options:
  - Structured-output LLM call (JSON via `responseMimeType: "application/json"`)
  - Embeddings + cosine similarity against a fixed tag set — far cheaper and faster if tags are predefined; LLM approach only justified for free/dynamic tags
- Realtime vs deferred split: which features tolerate latency and can be queued (tagging, summaries) vs need streaming UX (code explanation, prompt optimization). Note: Gemini free tier does NOT include a discounted Batch API — "batching" here means app-level queueing to respect RPM, not a paid batch endpoint
- Error handling and rate limiting: handle `429 RESOURCE_EXHAUSTED`, implement exponential backoff with jitter, queue requests to stay under free-tier RPM (which is tight)
- Pro user gating patterns
- Quota / cost optimization strategies:
  - On free tier the binding constraint is RPM/RPD, not dollars — minimize call count (tag/summarize multiple items per request where possible), dedupe, queue non-urgent work
  - Route all simple tasks to `flash-lite`, reserve `flash` for genuine reasoning tasks
  - Context caching for repeated static prefixes (system prompt, tag schema) — mainly relevant when moving to the paid tier or under TPM pressure
- Fallback provider strategy: a provider-agnostic interface (single `generateText` / `generateJSON` abstraction) to fall back to a second free tier (e.g. Groq) when the Gemini daily quota is exhausted
- UI patterns for AI features (loading states, accept/reject suggestions)
- Security considerations: API key handling (server-only, no `NEXT_PUBLIC_` prefix, keep in `.env.local`, add to Vercel env vars), input sanitization
- Data privacy note: on the free tier, Gemini inputs and outputs may be used by Google to improve its models — flag which features must not send sensitive data (e.g. private user notes, third-party code)

## Sources

- Web search for Gemini + Next.js patterns
- Context7 docs for the `@google/genai` SDK
- Official Gemini API docs (ai.google.dev) for model IDs, rate limits, and structured output
- Existing codebase patterns (server actions, Pro gating)
- @src/actions/\*.ts for action patterns
- @src/lib/usage-limits.ts for gating patterns
