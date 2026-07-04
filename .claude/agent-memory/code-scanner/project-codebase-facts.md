---
name: project-codebase-facts
description: Stable architectural facts about the CodeVault codebase to avoid recurring false positives across audits
metadata:
  type: project
---

All dashboard/item/collection DB queries are deliberately demo-user-scoped (getDemoUser via React cache). Ownership migration to the real signed-in user is deferred per roadmap — do NOT flag demo-scoped queries as IDOR/missing auth.

Profile page and auth actions (changePassword, deleteAccount) ARE correctly scoped to the real session user.

AppShell performs both a server-side auth() redirect AND proxy.ts provides the edge-layer guard. Both are intentional defense-in-depth — do not flag as redundant.

Rate limiting fails open by design when Upstash is not configured. This is a documented, intentional choice.

Tailwind v4 — no tailwind.config.* file is intentional. Config lives in globals.css @theme.

.env is in .gitignore — never report env secrets as committed without concrete verification.

VerificationToken model is reused for both email-verification tokens (identifier=email) and password-reset tokens (identifier=password-reset:{email}). This is intentional namespace separation.

The upload endpoint (POST /api/upload) does NOT create the DB item — it only uploads to R2. Item creation is a separate Server Action call. An orphaned R2 object on cancel is a known, accepted trade-off.

src/lib/r2.ts is server-only. src/lib/validations/file.ts intentionally has NO server-only (shared client+server for fast feedback in FileUpload component).

The getItemsByTypeSlug function fetches ALL system item types first, then finds the matching one — not a performance problem given only 7 system types (small, stable, could be cached but negligible).

Known gap (not a finding): login rate limit counts successful sign-ins toward the 5/15m window. Noted in history as an accepted trade-off.

**IMPORTANT — demo-user scoping is STALE as of audit 2026-07-04.** The whole domain layer (items.ts, collections.ts, favorites.ts, profile.ts, search.ts) was migrated to `getSessionUser()`/real session-based ownership per the "Collections Pages" feature (see current-feature.md history). Do NOT flag missing ownership scoping — it's there. However, several code comments still say "demo-user-scoped" (stale/misleading, not a functional bug): `src/actions/items.ts:23,60,156`, `src/actions/collections.ts:26`, `src/lib/db/profile.ts:6`, `src/app/api/items/[id]/route.ts:7`, `src/app/api/items/[id]/download/route.ts:9`. Flagged as Low code-quality (misleading docs) in the 2026-07-04 audit.

**Corrected from prior memory (2026-07-04):** `AppShell.tsx`'s `redirect(\`/sign-in?callbackUrl=${callbackUrl}\`)` is NOT an open-redirect / injection vector — every call site (`*/layout.tsx` files) passes a hardcoded literal string ("/dashboard", "/settings", etc.), never user input. Do not re-flag as a security issue; at most a defensive-encoding nitpick.

**Finding confirmed real (audit 2026-06-28) — re-verified 2026-07-04:**
- `consumeVerificationToken` in verification-token.ts NOW HAS the `password-reset:` prefix exclusion guard (line 52) — this was FIXED since the last audit. Do not re-flag.
- `getItemsByTypeSlug` still fetches all system ItemTypes on every request before filtering in JS — minor inefficiency, still present.
- `getDashboardCollections`/`getAllCollections`/`getPaginatedCollections` still use `include: { items: { select: { type: ... } } }` (collectionCardInclude) which loads every item row in the collection just to count/derive types — still present, real N+1-like over-fetch for large collections.

**Other confirmed findings (audit 2026-07-04):**
- `src/proxy.ts` matcher only covers `/dashboard/:path*` and `/profile/:path*`, but many more routes now rely on AppShell for auth (settings, favorites, collections, pinned, recent, items, upgrade) — the edge-layer guard is effectively a no-op for most protected routes now (AppShell's own `auth()` redirect is the real guard, so not a security hole, just a stale/incomplete perf optimization).
- `src/lib/mock-data.ts` (313 lines) is fully dead code — zero imports anywhere in src/. Confirmed via grep.
- `src/components/items/NewItemDialog.tsx` and `src/components/items/ItemEditForm.tsx` duplicate the same CONTENT_TYPES/LANGUAGE_TYPES type-classification Sets rather than sharing one source (item-content-types.ts already exists for the code/language classification but not the per-type field-visibility sets).
- Every authenticated request triggers overlapping `prisma.user.findUnique` calls for the same user row: the `jwt()` callback in `auth.ts` (re-reads isPro every token pass), `getSessionUser()` (React-cached, but separate query), and `getCurrentUser()`/`getProfileData()` (not cache-wrapped, each does their own lookup). Minor duplicate-query overhead on every page load.
- `src/app/items/[type]/page.tsx` and `src/app/collections/[id]/page.tsx` embed domain derivation logic directly in the route file (toCreateType(), isImage/isFile predicates, cardItems/imageItems/fileItems filtering) instead of a component/lib helper — violates the project's own "thin route files" rule.
- Uploaded SVGs (image kind) are stored with their original `image/svg+xml` content-type and served straight from the R2 public URL; if a user opens the raw fileUrl directly (not via `<img>`) an embedded `<script>` in the SVG could execute in the R2 bucket's origin. Rendering via `<img src>` in ImageCard/ItemContentBody is safe (browsers don't execute scripts in `<img>`-loaded SVGs), so exposure is limited to someone opening the raw URL directly.
- `createItemSchema`'s `fileUrl` field (validations/items.ts) is only `optionalTrimmed` (any non-empty string), not validated as a well-formed URL or checked against the R2 public URL prefix — a forged `createItem` call could store an arbitrary external URL as an item's fileUrl.
