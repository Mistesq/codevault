# AI Explain Code

## Overview

Add AI-powered code explanation for snippets and commands in the item drawer using Google Gemini (`gemini-2.5-flash`). These are the two item types where explanation adds value — actual code and terminal commands. Other types (prompts, notes, links, files, images) are already human-readable or non-code. Pro-only feature. Explanation displays inline via a tab interface in the code editor, not as a separate panel.

## Requirements

- Create an `explainCode` server action with auth, Pro gating, Zod validation, rate limiting
- Reuse the Gemini client and rate-limit config established by the auto-tagging feature (`@google/genai`). This action uses the **reasoning tier** `gemini-2.5-flash` (not the `gemini-2.5-flash-lite` default used for tagging) — code explanation benefits from the stronger model. Fall back to `flash-lite` if the `flash` free-tier daily quota proves too tight
- Add "Explain" button (Sparkles icon) to code editor window controls header (next to Copy button)
- Only show for snippet and command types in the item drawer (not in create/edit forms)
- After generating, show Code/Explain tabs in the editor header to toggle between views
- Render explanation as markdown in the same container space as the code editor
- Explanation should be concise (~200-300 words) covering what the code does and key concepts
- Prefer streaming (`generateContentStream`) and render the markdown progressively as tokens arrive — better UX for a multi-sentence explanation than a blank wait. Keep the Loader2 spinner only for the initial connection / first token, then stream into the Explain tab. Output is plain markdown text, so no JSON format config is needed here (unlike auto-tagging)
- Pro gating in UI: show Crown icon + tooltip ("AI features require Pro subscription") for free users
- Error handling via toast (Pro gating, rate limit, AI service errors). Handle Gemini `429 RESOURCE_EXHAUSTED` (free-tier quota) gracefully — the RPM/RPD quota is shared per-project across all users, so the per-user rate limit is a fairness guard, not the real ceiling
- Follow existing patterns
- Unit tests for server action

## Notes

- Explanations are not saved to the database — regenerated on each click
- Because explanations aren't cached, every click is a fresh Gemini call that counts against the shared free-tier quota — the per-user rate limit matters here to stop repeated re-clicks from draining it. Optionally add a lightweight per-session (in-memory) cache keyed by item id so re-opening the same item's explanation doesn't re-call
- Not available in create/edit forms, only in the item drawer read view
- `isPro` needs to be passed as a prop to the item drawer / code editor
- Free-tier privacy: the item's code/command content is sent to Google, which may use free-tier inputs/outputs to improve its models — acceptable for this project, but note it since real code is transmitted
- See `docs/ai-integration-plan.md` for full architectural context
