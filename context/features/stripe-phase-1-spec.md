# Stripe Integration Phase 1 - Core Infrastructure

## Overview

Stand up the server-side foundation for CodeVault Pro billing ($8/mo, $72/yr):
the Stripe SDK client singleton, the usage-limits / plan module, the checkout
input schema, and the checkout + customer-portal Server Actions. Everything in
this phase is unit-testable with mocked collaborators — **no Stripe CLI or live
webhook required**. Webhooks, feature gating, and UI land in Phase 2.

Full code samples and rationale live in
[docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md)
(§4.1–§4.6, §9). This spec is the checklist; defer to the plan for exact code.

## Requirements

- Install the `stripe` Node SDK (v19.x). Do **not** add `@stripe/stripe-js` — we
  use Stripe-hosted Checkout/Portal, no client Elements.
- Lazy client singleton + config guard, mirroring `src/lib/r2.ts` and
  `src/lib/email/resend.ts`.
- Pure, env-driven usage-limits module (plan caps + interval lookups + at-limit
  predicates) that is fully unit-tested.
- Zod schema for the checkout action input.
- `createCheckoutSession` + `createPortalSession` Server Actions following the
  existing `{ success, data?, error? }` pattern with an `auth()` guard.

## Files to Create

1. `src/lib/stripe/client.ts` — `getStripe()` lazy singleton + `isStripeConfigured()`
   (true only when secret key **and** both price ids are set). `import "server-only"`.
2. `src/lib/billing/plan.ts` — the **usage-limits module** (server-only):
   - `FREE_LIMITS = { items: 50, collections: 3 }`
   - `BillingInterval` type (`"monthly" | "yearly"`)
   - `priceIdForInterval(interval)` and `intervalForPriceId(priceId)` (env-driven,
     reverse lookup used later by the webhook)
   - `isAtItemLimit(isPro, count)` / `isAtCollectionLimit(isPro, count)` — pure
     predicates (`!isPro && count >= cap`)
   - `PlanLimitError` class (thrown by Phase 2 gating; defined here so both phases
     share it)
3. `src/lib/validations/billing.ts` — `checkoutSchema` (`z.object({ interval: z.enum(["monthly","yearly"]) })`) + `CheckoutInput` type.
4. `src/actions/billing.ts` — `createCheckoutSession(input)` and `createPortalSession()`:
   - `auth()` guard → `{ success:false }` when unsigned.
   - `isStripeConfigured()` guard.
   - Checkout: validate input, resolve `priceIdForInterval`, reject already-Pro,
     `mode: "subscription"`, reuse `stripeCustomerId` or fall back to
     `customer_email`, set `client_reference_id: userId` **and**
     `subscription_data.metadata.userId`, `success_url`/`cancel_url` off
     `getAppUrl()` (`/settings?checkout=success|cancelled`). Return `{ url }`.
   - Portal: require `stripeCustomerId`, `return_url` → `/settings`, return `{ url }`.
   - The calling client component redirects via `window.location.href = data.url`
     (Server Actions can't `redirect()` to an external origin) — that wiring is Phase 2.

## Files to Modify

1. `context/project-overview.md` — env block: add `STRIPE_PRICE_MONTHLY` /
   `STRIPE_PRICE_YEARLY` (base Stripe keys already listed).

## Environment Variables

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_MONTHLY=price_...          # $8/mo recurring price id
STRIPE_PRICE_YEARLY=price_...           # $72/yr recurring price id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # reserved; unused by hosted checkout
# STRIPE_WEBHOOK_SECRET — added in Phase 2
# NEXT_PUBLIC_APP_URL already consumed via getAppUrl()
```

## Key Gotchas

- Read `process.env.*` directly — there is **no** central env module in this repo.
- `getStripe()` must throw (not silently no-op) when `STRIPE_SECRET_KEY` is
  missing; `isStripeConfigured()` is the soft guard the actions branch on.
- Omit `apiVersion` to pin the SDK default, or set it explicitly to the dashboard
  version once live.
- Server-only modules (`client.ts`, `plan.ts`) must start with `import "server-only"`
  and must never be imported into a `'use client'` component.

## Testing

Vitest, server actions + utilities only. Co-locate `*.test.ts`; mock
`@/lib/prisma`, `@/auth`, and the Stripe client with `vi.mock` + `vi.hoisted`.

- `src/lib/billing/plan.test.ts` — **usage-limits unit tests (required this phase):**
  - `isAtItemLimit` / `isAtCollectionLimit`: Free at/over cap → true; Free under
    cap → false; Pro at any count → false; boundary at exactly the cap.
  - `priceIdForInterval` monthly/yearly resolves the right env var; missing env → null.
  - `intervalForPriceId` round-trips both ids; unknown id → null.
- `src/actions/billing.test.ts` — unauthenticated → error; not-configured → error;
  already-Pro → error; happy path returns `{ url }` (Stripe mocked); portal with no
  `stripeCustomerId` → error.

Run `npm test` and `npm run build` before committing.

## Implementation Order

1. `npm install stripe`; add env keys; (Stripe Dashboard product/prices setup — see
   plan §6, needed before real checkout but not before unit tests).
2. `src/lib/stripe/client.ts`.
3. `src/lib/billing/plan.ts` + `plan.test.ts`.
4. `src/lib/validations/billing.ts`.
5. `src/actions/billing.ts` + `billing.test.ts`.

## References

- Plan: [docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md) §4.1–§4.6, §6, §9
- Client-singleton pattern: `src/lib/r2.ts`, `src/lib/email/resend.ts`
- Config-flag pattern: `isR2Configured()`, `isEmailVerificationEnabled()`
- `getAppUrl()`: `src/lib/email/resend.ts`
