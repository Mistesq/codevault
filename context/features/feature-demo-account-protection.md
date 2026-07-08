# Feature: Demo Account Protection & Reset-on-Login

## Status

Proposed

## Problem

The public demo account (credentials published in the README) is shared by every visitor. Two risks follow:

1. **Account takeover**: if the demo user can change their password or email, a single malicious visitor permanently locks the demo. The README credentials stop working, which is the worst possible first impression — a broken front door on a portfolio project.
2. **Data degradation**: visitors create junk snippets and delete curated ones. The demo data is the rehearsed first screen of the product; within weeks of traffic it degrades into noise, and the next reviewer sees a mess instead of a showcase.

AI abuse through the shared account is already mitigated by existing per-user rate limiting and is out of scope here.

## Requirements

### Functional

- The demo user cannot change their password or email, and cannot delete the account. Any other persistent account-level settings (if present) are equally locked.
- Blocked operations are enforced server-side in the corresponding server actions (UI hiding is cosmetic, not the guarantee) and return a clear, friendly error (e.g. "This action is disabled on the demo account").
- On successful demo-user login, the demo workspace is reset to a canonical seed — but at most once per throttle window (default: 30 minutes), so a login shortly after a previous reset does not wipe an ongoing session.
- Reset replaces all demo-user content (snippets and their owned relations) with the canonical seed atomically: no intermediate state where the workspace is empty or half-seeded.
- The canonical seed contains 6–8 curated snippets that showcase product features without the visitor creating anything: multiple languages (syntax highlighting variety), tags, filled AI-generated fields (summary/tags), at least one favorited item if favorites exist.
- Login must not break if the reset fails: reset errors are logged, login proceeds (fail-open for availability of the demo itself).

### Non-functional

- No new infrastructure (no cron, no external schedulers) — the reset lives in the authentication flow.
- Reset adds no perceptible latency budget beyond ~1s to demo login; regular users are entirely unaffected (zero extra queries on non-demo login).
- Demo identification must not be spoofable by client input: derived from the database record (flag or fixed known ID), never from client-supplied data.

## Design

### Demo identification

Add `isDemo Boolean @default(false)` to the `User` model (migration required) and set it for the demo user in seed. Guards check the flag on the server-loaded user record.

Rationale — flag over hardcoded user ID: a schema-level flag is self-documenting, survives database re-seeds where IDs change, and permits a second demo account later (e.g. a clean one for interviews) with zero code changes. Cost is one boolean column.

### Operation guards

In the account-related server actions (change password, change email, delete account, and any settings mutations identified during implementation): load the acting user, and if `isDemo`, return the standard action error shape with the friendly message before any mutation. This is one early guard per action, consistent with the existing layered validation order (auth → ownership → input → mutation).

UI: hide or disable the corresponding controls for the demo session as polish, with the server guard as the actual boundary.

### Reset-on-login with throttle

Chosen strategy: reset inside the auth flow, immediately after successful credential verification for a user with `isDemo = true`.

Throttle: add `demoLastResetAt DateTime?` to the `User` model (or a dedicated single-row table if preferred during implementation). On demo login:

1. If `demoLastResetAt` is null or older than the throttle window (default 30 min, constant in code) → run reset, update timestamp.
2. Otherwise skip reset silently.

The throttle check and timestamp update happen inside the same transaction as the reset to avoid double-reset under concurrent logins.

Rationale — reset-on-login over cron: every reviewer is guaranteed a fresh showcase at the exact moment they arrive (cron leaves junk visible for up to a day on the Hobby-plan daily schedule); zero new infrastructure vs. cron's route handler + CRON_SECRET + vercel.json; the throttle removes the strategy's one real drawback (a second visitor's login wiping the first visitor's mid-session work) down to an accepted, window-bounded risk. Timestamp in Postgres over Upstash: the throttle state belongs with the data it guards, participates in the reset transaction, and adds no network hop.

### Reset semantics

Within one transaction:

1. Delete all demo-user-owned content: snippets and every relation owned through them (resolve the exact model list against the Prisma schema during implementation — tags/favorites/AI metadata as applicable; rely on cascading deletes where defined, delete explicitly where not).
2. Insert the canonical seed.
3. Update `demoLastResetAt`.

The demo user row itself (id, credentials, isDemo) is never deleted or recreated — only owned content — so sessions and auth remain stable across resets.

### Canonical seed content

Seed data lives in code as a typed constant module (e.g. `src/lib/demo/seed-data.ts`), imported by both the reset routine and the database seed script — one source of truth, no drift between "fresh deploy" and "reset" states. Content is curated for showcase value: realistic snippet names and bodies across several languages, tags applied, AI summary fields pre-filled with real (one-time generated) output rather than lorem ipsum, so the AI features are visible without spending API quota on every reset.

## Edge cases

- **Concurrent demo logins racing the reset**: two logins inside the same instant could both pass the throttle check. Mitigation: check-and-update inside the reset transaction; residual risk (double reset to identical state) is harmless.
- **Reset wiping an active visitor's work mid-session**: accepted by design — demo work is ephemeral by nature and the throttle window bounds the annoyance. The window value is a single constant; tune if real usage shows friction.
- **Reset failure at login** (DB hiccup, partial outage): login must still succeed with whatever data exists; error is logged. A broken demo login is strictly worse than a stale demo.
- **Spoofed demo status**: guards must read `isDemo` from the server-side user record, never from session claims or client input. If `isDemo` is added to the JWT/session for UI purposes, it is display-only.
- **Demo user modifies then immediately re-logs**: within the throttle window they see their own junk — acceptable; the window exists to protect active sessions, and the next reviewer after the window gets a clean state.
- **AI quota via demo account**: existing per-user rate limiting covers it; verify during implementation that the demo user gets the standard (not elevated) limit.
- **Seed drift**: seed constant referenced by both reset and seed script; a unit test asserting the reset routine produces exactly the seed content guards against divergence.

## Out of scope

- Cron-based or scheduled resets, and any reset-admin UI.
- Per-visitor isolated demo sandboxes (ephemeral users) — the right design for a product, overkill for a portfolio demo.
- AI rate limiting changes.
- README changes beyond none required (credentials stay as published).

## Acceptance criteria

- [ ] Migration adds `isDemo` and `demoLastResetAt`; demo user is flagged in seed.
- [ ] Password change, email change, and account deletion attempts on the demo account are rejected server-side with the friendly error; corresponding UI controls are hidden/disabled for the demo session.
- [ ] Logging into the demo account after the throttle window restores the workspace to exactly the canonical seed (verified by test comparing post-reset state to the seed constant).
- [ ] Logging in twice within the throttle window performs exactly one reset.
- [ ] A simulated reset failure does not block login.
- [ ] Regular (non-demo) users: no new queries, no behavior change (verified by test on the auth path).
- [ ] Unit tests cover: guard rejection for each blocked action, guard pass-through for regular users, throttle logic (fresh reset / skip within window), seed-reset equivalence.
- [ ] Demo walkthrough after deploy: login with README credentials shows the curated showcase (languages, tags, AI fields visible) with zero user actions.
