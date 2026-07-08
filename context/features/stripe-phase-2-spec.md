# Stripe Integration Phase 2 - Webhooks, Feature Gating & UI

## Overview

Build on the Phase 1 infrastructure
([stripe-phase-1-spec.md](./stripe-phase-1-spec.md)) to make Pro real end-to-end:
the webhook receiver that syncs subscription state → `User.isPro`, Free-tier
feature gating on the create paths and file uploads, and the Billing UI on
`/settings`. Unlike Phase 1, the webhook flow **requires the Stripe CLI**
(`stripe listen` / `stripe trigger`) plus Test-mode checkout for full
verification.

Full code and rationale: [docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md)
§4.7–§4.9, §5, §7, §8.

**Prerequisite:** Phase 1 merged (`getStripe`, `isStripeConfigured`, the
usage-limits module incl. `intervalForPriceId` + `PlanLimitError`, and the
billing actions all exist).

## Requirements

- Public webhook route that verifies the Stripe signature and reconciles Pro
  state idempotently.
- Enforce Free-tier caps (50 items, 3 collections) at the two create paths, and
  gate **file** uploads (not images) behind Pro.
- Add a Billing card to `/settings` with Upgrade / Manage-subscription buttons.
- Keep the client `useSession().data.user.isPro` in sync after webhook updates
  (JWT callback).

## Files to Create

1. `src/lib/billing/sync.ts` (server-only) — `syncSubscriptionToUser(sub)`:
   resolve the user by `stripeCustomerId`, falling back to
   `sub.metadata.userId`; set `isPro` from active-ish status
   (`active` | `trialing` → true; canceled/unpaid/deleted → false),
   persist `stripeCustomerId` and `stripeSubscriptionId` (null when inactive).
   **Idempotent** — safe on duplicate/redelivered events.
2. `src/app/api/webhooks/stripe/route.ts` — `POST` receiver:
   - Guard `STRIPE_WEBHOOK_SECRET` (503 if unset) and the `stripe-signature`
     header (400 if missing).
   - Read the **raw** body with `await request.text()` (never `.json()`), then
     `getStripe().webhooks.constructEvent(...)` → 400 on verification failure.
   - Handle `checkout.session.completed` (retrieve the subscription, then sync),
     `customer.subscription.created|updated|deleted` (sync directly).
   - Return 500 on handler error so Stripe retries; 200 `{ received: true }` otherwise.
3. `src/components/billing/BillingSection.tsx` — **server** component; takes
   `isPro`, renders plan copy + the right button.
4. `src/components/billing/UpgradeButtons.tsx` — **client**; Monthly/Yearly →
   `createCheckoutSession({ interval })` → `window.location.href = data.url`;
   pending state; `toast.error` on failure.
5. `src/components/billing/ManageSubscriptionButton.tsx` — **client**;
   `createPortalSession()` → redirect to `data.url`.

## Files to Modify

1. `src/lib/db/items.ts` — in `createItem`, after resolving `user` and before the
   `$transaction`: `count` the user's items and `throw new PlanLimitError("item")`
   when `isAtItemLimit(user.isPro, count)`. Also gate the **FILE** branch (Image
   stays free, File is Pro-only) to prevent bypassing the upload route.
2. `src/actions/items.ts` — catch `PlanLimitError` in `createItem` → return
   `{ success:false, error: "You've reached the Free plan's 50-item limit. Upgrade to Pro for unlimited items." }`.
3. `src/lib/db/collections.ts` — same gating in `createCollection` with
   `prisma.collection.count` + `isAtCollectionLimit` → `PlanLimitError("collection")`.
4. `src/actions/collections.ts` — catch `PlanLimitError` → upgrade CTA error.
5. `src/app/api/upload/route.ts` — after the `auth()` guard, when `kind === "file"`
   look up `isPro`; non-Pro → 402 `{ error: "File uploads are a Pro feature." }`.
   Images remain open.
6. `src/app/settings/page.tsx` — render `<BillingSection isPro={profile.isPro} />`
   (between the Account and Editor-preferences cards). Optionally read
   `searchParams.checkout` to toast "Welcome to Pro!" / "Checkout cancelled".
7. `src/auth.ts` + `src/types/next-auth.d.ts` — add a `jwt()` callback that always
   re-reads `isPro` from the DB and exposes it on the session; augment `Session.user`
   and `JWT` with `isPro`. (Server gating already sees live `isPro` via
   `getSessionUser()`; this is purely so client `useSession()` reflects Pro after a
   plain reload. See plan §7 — optional if no client component reads it.)
8. *(Optional)* `prisma/schema.prisma` — add `stripePriceId` +
   `stripeCurrentPeriodEnd` for renewal-date / interval UI, then
   `npx prisma migrate dev --name add_stripe_billing_fields`. **Neon development
   branch only (ID in `CLAUDE.local.md`) — never production.** If skipped, drop
   the corresponding lines in `sync.ts`.

## Environment Variables

```
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen` locally; dashboard endpoint in prod
```

## Key Gotchas

- The webhook is **public and must stay public** — `constructEvent`'s signature
  check *is* the authentication. Do **not** add an `auth()` guard.
- Keep the route on the **Node runtime** (Next default). Never set
  `export const runtime = "edge"` — signature verification uses Node `crypto`.
- Webhook is the **source of truth** for `isPro`, not the checkout success
  redirect (which can be closed or spoofed) — redirect only refreshes the UI.
- Both `client_reference_id` and `subscription_data.metadata.userId` carry the
  user id so `sync.ts` resolves the user even before `stripeCustomerId` is stored.

## Testing

**Automated (Vitest — `npm test`):** mock `@/lib/prisma`, `@/auth`, Stripe.

- `src/lib/billing/sync.test.ts` — active → `isPro:true`; deleted/unpaid →
  `isPro:false` + `stripeSubscriptionId:null`; unknown customer → no-op;
  idempotent on re-delivery.
- Extend `src/lib/db/items.test.ts` / `collections.test.ts` — Free user at cap
  rejected (`PlanLimitError`); Pro user not gated; Free under cap succeeds.

**Manual (Test mode — requires the Stripe CLI):**

1. `stripe login`, then `stripe listen --forward-to localhost:3000/api/webhooks/stripe`;
   use the printed `whsec_…` as local `STRIPE_WEBHOOK_SECRET`.
2. Free user → `/settings` shows Upgrade → checkout with `4242 4242 4242 4242` →
   webhook fires → `isPro=true`, `stripeCustomerId`/`stripeSubscriptionId` set →
   `/settings` shows Pro.
3. Pro user → Manage subscription → portal → cancel →
   `customer.subscription.deleted` → `isPro=false`. Monthly↔yearly switch →
   `customer.subscription.updated` reconciles.
4. Free user at 50 items / 3 collections → upgrade error; Pro unlimited.
5. Free user file upload blocked (402); image upload still works.
6. Bad signature → 400; duplicate delivery → no double effect.
7. `stripe trigger checkout.session.completed` etc. for event-level checks.
8. `npm run build` + `npm run lint` clean.

## Implementation Order

1. Stripe Dashboard: enable Customer Portal + create the webhook endpoint (plan §6).
2. `src/lib/billing/sync.ts` + webhook route; verify with `stripe listen` (+ tests).
3. Billing UI components; wire `<BillingSection>` into `/settings`.
4. Plan-limit gating in `createItem` / `createCollection` (+ tests).
5. Pro-gate file uploads (route + FILE branch of `createItem`).
6. *(Optional)* JWT `isPro` sync + type augmentation.
7. *(Optional)* migration for `stripePriceId` / `stripeCurrentPeriodEnd` (dev branch).
8. Full manual pass; `npm test` + `npm run build`.

## References

- Plan: [docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md) §4.7–§4.9, §5–§8
- Route/webhook patterns: `src/app/api/auth/register/route.ts`, `src/app/api/upload/route.ts`
- Neon rules: development branch only (ID in `CLAUDE.local.md`)
