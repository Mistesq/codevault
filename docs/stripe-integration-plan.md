# Stripe Subscription Integration Plan — CodeVault Pro

> Research deliverable. Documentation only — no source was modified.
> Target: **CodeVault Pro** — `$8/mo` (monthly) / `$72/yr` (annual).

---

## 0. TL;DR

The schema is already 90% ready: `User` carries `isPro`, `stripeCustomerId`, and
`stripeSubscriptionId`. What's missing is the **Stripe SDK + client singleton**,
a **checkout action**, a **customer-portal action**, a **webhook route** that
syncs subscription state back to `isPro`, **plan-limit gating** on the two create
paths (items / collections) and on file uploads, and a **Billing section** on the
settings page.

Nothing here breaks existing auth. Server-side gating is reliable today because
`getSessionUser()` / `getCurrentUser()` already read `isPro` **fresh from the DB**
on every request — the JWT sync (§7) is only needed so the _client_ `useSession()`
picks up webhook changes.

---

## 1. Current State Analysis

### 1.1 `User` schema — [prisma/schema.prisma](../prisma/schema.prisma#L23-L47)

```prisma
model User {
  id                   String  @id @default(cuid())
  email                String  @unique
  isPro                Boolean @default(false)
  stripeCustomerId     String? @unique
  stripeSubscriptionId String? @unique
  // ...
}
```

All three billing fields exist. **No migration is strictly required.** An
_optional_ migration (§2.1) adds `stripePriceId` + `stripeCurrentPeriodEnd` for
richer billing UI (renewal date, monthly-vs-yearly display).

### 1.2 Auth / session — NextAuth v5, JWT strategy

- Split config: [src/auth.config.ts](../src/auth.config.ts) is **edge-safe**
  (providers only, no Prisma); [src/auth.ts](../src/auth.ts) is the full Node
  instance with the Prisma adapter and `session: { strategy: "jwt" }`.
- The **only** callback today is `session()` — it copies `token.sub` →
  `session.user.id`. **There is no `jwt()` callback yet.** (§7 adds one.)
- [src/types/next-auth.d.ts](../src/types/next-auth.d.ts) only augments
  `session.user` with `id`. `isPro` is **not** on the session type yet.

### 1.3 How `isPro` is read today

- [src/lib/db/user.ts](../src/lib/db/user.ts) — `getSessionUser()` (React
  `cache()`) selects `{ id, name, isPro }` **from the DB**; `getCurrentUser()`
  selects `isPro` fresh from the DB. So **every server component / server action
  already sees the live `isPro`** — webhook updates take effect on the next
  request with no session refresh needed.
- [src/lib/db/profile.ts](../src/lib/db/profile.ts) — `getProfileData()` returns
  `isPro`, already consumed by the profile + settings pages.

**Implication:** server-side plan gating is trustworthy immediately. The JWT
callback in §7 exists purely to keep the client `useSession().data.user.isPro`
in sync (e.g. hiding "Upgrade" buttons without a hard reload).

### 1.4 Existing payment code

None. `grep` for `stripe` in `src/` returns only the three schema fields. `stripe`
is **not** in [package.json](../package.json).

---

## 2. Feature Gating Analysis

### 2.1 Free-tier limits (from project spec)

| Plan | Items | Collections | File uploads     | AI  | Custom types | Export |
| ---- | ----- | ----------- | ---------------- | --- | ------------ | ------ |
| Free | 50    | 3           | ❌ (images only) | ❌  | ❌           | ❌     |
| Pro  | ∞     | ∞           | ✅               | ✅  | ✅           | ✅     |

### 2.2 Where counts are / should be checked

Counts are **not** enforced anywhere today. The two create paths are the
enforcement points (server-side, in the DB layer where the session user is
already resolved):

- **Items** — [`createItem()` in src/lib/db/items.ts:321](../src/lib/db/items.ts#L321).
  After `getSessionUser()`, before the `$transaction`, count the user's items and
  reject when a Free user is at `FREE_LIMITS.items`.
- **Collections** — [`createCollection()` in src/lib/db/collections.ts:274](../src/lib/db/collections.ts#L274).
  Same shape against `FREE_LIMITS.collections`.

Both already call `getSessionUser()` (which returns `isPro`), so gating needs no
new lookups beyond a `count`. Return `null`/a typed rejection so the calling
**action** ([src/actions/items.ts](../src/actions/items.ts),
[src/actions/collections.ts](../src/actions/collections.ts)) maps it to a
user-facing "Upgrade to Pro" error, consistent with the existing
`{ success, error }` pattern.

### 2.3 Pro-only feature surfaces (present in code today)

- **File uploads** — [/api/upload route](../src/app/api/upload/route.ts) and the
  `FILE` branch of `createItem`. Today uploads are open to any signed-in user.
  Gate the route (`isPro` check → 402/403) and the `createItem` FILE branch.
  _Images_ stay free per spec; _file_ uploads become Pro (`kind === "file"`).
- **AI / custom types / export** — not implemented yet; gate them at build time
  using the same `assertPro()` helper (§4.4). Out of scope to build here.

### 2.4 Settings page structure

[src/app/settings/page.tsx](../src/app/settings/page.tsx) already renders inside
the dashboard `AppShell` (via [settings/layout.tsx](../src/app/settings/layout.tsx),
`callbackUrl="/settings"`, `force-dynamic`) and calls `getProfileData()` (which
returns `isPro`). It has an "Account" card and an "Editor preferences" card. **Add
a "Billing" card** between them (§5.4) — a server component that shows the plan
and renders either an **Upgrade** (checkout) or **Manage subscription** (portal)
button based on `profile.isPro`.

---

## 3. API & Webhook Patterns (to match)

- **Route handlers:** `export async function POST(request: Request)`, guard with
  `const session = await auth()`, return `NextResponse.json(..., { status })`.
  See [register route](../src/app/api/auth/register/route.ts) and
  [upload route](../src/app/api/upload/route.ts).
- **Webhooks need the raw body.** Use `await request.text()` (never `.json()`)
  and `request.headers.get("stripe-signature")`, then
  `stripe.webhooks.constructEvent(...)`. The route must run on the **Node
  runtime** (default in Next 16) — do **not** add `export const runtime = "edge"`,
  because signature verification uses Node `crypto`.
- **Lazy client singletons** (matches [src/lib/r2.ts](../src/lib/r2.ts) and
  [src/lib/email/resend.ts](../src/lib/email/resend.ts)): a `getStripe()` that
  instantiates on first use, plus an `isStripeConfigured()` guard.
- **Feature-flag / env helper** pattern: mirror
  [isEmailVerificationEnabled()](../src/lib/auth/email-verification.ts) and
  `isR2Configured()`. Read `process.env.*` directly; **no** central env module
  exists.
- **Server-action pattern:** `"use server"`, `auth()` guard, Zod validate,
  `try/catch`, return `{ success, data?, error? }`, `revalidatePath()` after
  mutations. Server-only modules start with `import "server-only"`.
- **Base URL:** use `getAppUrl()` from
  [src/lib/email/resend.ts](../src/lib/email/resend.ts#L24)
  (`NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"`) for `success_url` /
  `cancel_url` / portal `return_url`.
- **Tests:** Vitest, **server actions + utilities only** (no UI). Co-locate
  `*.test.ts`, mock `@/lib/prisma`, `@/auth`, and the Stripe client with
  `vi.mock` + `vi.hoisted`.

---

## 4. Files to Create

### 4.1 `package.json` — add dependency

```bash
npm install stripe
```

`stripe` (Node SDK, currently v19.x) only. `@stripe/stripe-js` is **not** needed —
we redirect to Stripe-hosted Checkout/Portal via `session.url`, no client Elements.

### 4.2 `.env` additions (document in project-overview's env block)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # reserved; not used by hosted checkout
STRIPE_PRICE_MONTHLY=price_...                    # $8/mo recurring price id
STRIPE_PRICE_YEARLY=price_...                     # $72/yr recurring price id
# NEXT_PUBLIC_APP_URL already used elsewhere (getAppUrl)
```

### 4.3 `src/lib/stripe/client.ts` — lazy SDK singleton + config guard

```typescript
import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

/** Lazily instantiate the Stripe client (mirrors getResend / getFromR2). */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  // Pin apiVersion to the SDK's default by omitting it, or set explicitly to
  // the version shown in your Stripe Dashboard once integration is live.
  cached = new Stripe(key);
  return cached;
}

/** True when the secret key + both price ids are configured. */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_MONTHLY &&
    process.env.STRIPE_PRICE_YEARLY,
  );
}
```

### 4.4 `src/lib/billing/plan.ts` — plan limits + gating helpers (server-only)

```typescript
import "server-only";

/** Free-tier caps from the project spec. Pro is unlimited. */
export const FREE_LIMITS = { items: 50, collections: 3 } as const;

export type BillingInterval = "monthly" | "yearly";

/** Resolve the configured price id for a checkout interval. */
export function priceIdForInterval(interval: BillingInterval): string | null {
  return interval === "yearly"
    ? (process.env.STRIPE_PRICE_YEARLY ?? null)
    : (process.env.STRIPE_PRICE_MONTHLY ?? null);
}

/** Reverse lookup used by the webhook to know which interval was purchased. */
export function intervalForPriceId(priceId: string): BillingInterval | null {
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}

/** True when a Free user is already at (or over) the given cap. */
export function isAtItemLimit(isPro: boolean, count: number): boolean {
  return !isPro && count >= FREE_LIMITS.items;
}
export function isAtCollectionLimit(isPro: boolean, count: number): boolean {
  return !isPro && count >= FREE_LIMITS.collections;
}
```

> These are pure functions → **unit-testable** and satisfy the "domain logic
> lives in `src/lib`, not components" rule.

### 4.5 `src/lib/validations/billing.ts` — Zod schema for the checkout action

```typescript
import { z } from "zod";

export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

### 4.6 `src/actions/billing.ts` — checkout + portal server actions

```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { priceIdForInterval } from "@/lib/billing/plan";
import { checkoutSchema } from "@/lib/validations/billing";
import { getAppUrl } from "@/lib/email/resend";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Create a Stripe Checkout Session for Pro and return its URL for redirect. */
export async function createCheckoutSession(
  input: unknown,
): Promise<ActionResult<{ url: string }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be signed in." };

  if (!isStripeConfigured()) {
    return { success: false, error: "Billing is not configured." };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid plan." };

  const priceId = priceIdForInterval(parsed.data.interval);
  if (!priceId) return { success: false, error: "Plan is unavailable." };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isPro: true, stripeCustomerId: true },
    });
    if (!user) return { success: false, error: "Account not found." };
    if (user.isPro) return { success: false, error: "You're already Pro." };

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the saved customer, else let Stripe create one keyed to the email.
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      // client_reference_id links the Checkout Session back to our user in the
      // webhook, even before we have a stripeCustomerId stored.
      client_reference_id: userId,
      // Belt-and-suspenders: also stamp the user id on the subscription.
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${getAppUrl()}/settings?checkout=success`,
      cancel_url: `${getAppUrl()}/settings?checkout=cancelled`,
    });

    if (!checkout.url)
      return { success: false, error: "Could not start checkout." };
    return { success: true, data: { url: checkout.url } };
  } catch (error) {
    console.error("Create checkout session failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Create a Billing Customer Portal session for managing/cancelling the plan. */
export async function createPortalSession(): Promise<
  ActionResult<{ url: string }>
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "You must be signed in." };
  if (!isStripeConfigured()) {
    return { success: false, error: "Billing is not configured." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return { success: false, error: "No active subscription found." };
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/settings`,
    });
    return { success: true, data: { url: portal.url } };
  } catch (error) {
    console.error("Create portal session failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
```

> The client component calls the action, then does
> `window.location.href = data.url` on success (client-side redirect to
> Stripe-hosted pages). Server actions can't `redirect()` to an external origin.

### 4.7 `src/lib/billing/sync.ts` — DB sync used by the webhook (server-only)

```typescript
import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Reconcile a user's Pro state from a Stripe Subscription object. Called from
 * the webhook for every subscription lifecycle event. Idempotent: safe to run
 * on duplicate/re-delivered events. Resolves the user by stripeCustomerId, then
 * falls back to the subscription.metadata.userId stamped at checkout.
 */
export async function syncSubscriptionToUser(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Active-ish statuses grant Pro; canceled/unpaid/incomplete revoke it.
  const active = sub.status === "active" || sub.status === "trialing";

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { stripeCustomerId: customerId },
        { id: sub.metadata?.userId ?? "__none__" },
      ],
    },
    select: { id: true },
  });
  if (!user) {
    console.warn("Stripe subscription for unknown user:", customerId);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPro: active,
      stripeCustomerId: customerId,
      stripeSubscriptionId: active ? sub.id : null,
      // If the optional migration (§2.1) is applied, also persist:
      // stripePriceId: sub.items.data[0]?.price.id ?? null,
      // stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}
```

### 4.8 `src/app/api/webhooks/stripe/route.ts` — webhook receiver

```typescript
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { syncSubscriptionToUser } from "@/lib/billing/sync";

// Webhook signature verification needs the raw body + Node crypto — keep this on
// the Node runtime (the Next.js default). Do NOT set runtime = "edge".
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw text body — never request.json() here, it breaks signature checks.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Retrieve the subscription to get full status, then sync.
        if (session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(
            session.subscription as string,
          );
          await syncSubscriptionToUser(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionToUser(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Ignore unhandled event types.
        break;
    }
  } catch (error) {
    // Return 500 so Stripe retries; the handler is idempotent (§4.7).
    console.error(`Stripe webhook handler error (${event.type}):`, error);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

> **Auth note:** this route is public (Stripe has no session). The
> `constructEvent` signature check _is_ the authentication. Do not add an
> `auth()` guard here.

### 4.9 UI components (feature UI → `src/components/billing/`)

- `src/components/billing/BillingSection.tsx` — **server** component. Receives
  `isPro` (from `getProfileData()`), renders plan copy + the appropriate button.
- `src/components/billing/UpgradeButtons.tsx` — **client** (`"use client"`).
  Monthly/Yearly buttons → `createCheckoutSession({ interval })` → on success
  `window.location.href = data.url`; on error `toast.error(...)` (sonner). Shows
  a pending state while awaiting the action.
- `src/components/billing/ManageSubscriptionButton.tsx` — **client**. Calls
  `createPortalSession()` → redirect to `data.url`.

> Per coding standards these components only render UI + call the action; all
> price/limit logic stays in `src/lib/billing`.

### 4.10 Tests to add (Vitest, `*.test.ts`, mock prisma/auth/stripe)

- `src/lib/billing/plan.test.ts` — `priceIdForInterval`, `intervalForPriceId`,
  `isAtItemLimit`, `isAtCollectionLimit` (pure; env-driven cases).
- `src/actions/billing.test.ts` — unauthenticated → error; already-Pro → error;
  not-configured → error; happy path returns `{ url }` (Stripe mocked).
- `src/lib/billing/sync.test.ts` — active status → `isPro:true`; deleted/unpaid
  → `isPro:false` + `stripeSubscriptionId:null`; unknown customer → no-op.
- Extend `src/lib/db/items.test.ts` / `collections.test.ts` — Free user at cap
  is rejected; Pro user is not; Free user under cap succeeds.

---

## 5. Files to Modify

### 5.1 `prisma/schema.prisma` — _optional_ richer billing fields

Only if you want renewal date / interval in the UI:

```prisma
model User {
  // ...existing stripe fields...
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
}
```

Then (respecting the Neon rules — **development** branch
`br-autumn-sunset-asqlkegf`, never production):

```bash
npx prisma migrate dev --name add_stripe_billing_fields
```

If you skip this, drop the two commented lines in §4.7's `sync.ts`.

### 5.2 `src/lib/db/items.ts` — gate `createItem` (line ~321)

Insert after `const user = await getSessionUser(); if (!user) return null;` and
before the `$transaction`:

```typescript
import { isAtItemLimit } from "@/lib/billing/plan";

// ...inside createItem, after resolving `user`:
const count = await prisma.item.count({ where: { userId: user.id } });
if (isAtItemLimit(user.isPro, count)) {
  // Signal "limit reached" distinctly from other failures so the action can
  // show an upgrade CTA. Simplest: throw a typed error; or return a sentinel.
  throw new PlanLimitError("item");
}
```

Define a small `PlanLimitError` (e.g. in `src/lib/billing/plan.ts`) and catch it
in [src/actions/items.ts](../src/actions/items.ts) `createItem` to return
`{ success: false, error: "You've reached the Free plan's 50-item limit. Upgrade to Pro for unlimited items." }`.

### 5.3 `src/lib/db/collections.ts` — gate `createCollection` (line ~274)

Same pattern with `prisma.collection.count` + `isAtCollectionLimit`, caught in
[src/actions/collections.ts](../src/actions/collections.ts).

### 5.4 `src/app/settings/page.tsx` — add Billing card

```tsx
import { BillingSection } from "@/components/billing/BillingSection";
// ...
<EditorPreferencesForm />
<BillingSection isPro={profile.isPro} />   {/* new */}
<section /* Account actions */>...</section>
```

Optionally read `searchParams.checkout` to toast "Welcome to Pro!" /
"Checkout cancelled" after redirect back.

### 5.5 `src/app/api/upload/route.ts` — gate _file_ uploads to Pro

After the `auth()` guard, before touching R2:

```typescript
import { prisma } from "@/lib/prisma";
// ...
if (kind === "file") {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });
  if (!user?.isPro) {
    return NextResponse.json(
      { error: "File uploads are a Pro feature." },
      { status: 402 },
    );
  }
}
```

Also gate the FILE branch of `createItem` in [items.ts](../src/lib/db/items.ts)
(`FILE_TYPE_NAMES` covers File + Image — allow Image for Free, block File) to
prevent bypassing the route.

### 5.6 `src/auth.ts` + `src/types/next-auth.d.ts` — JWT sync (see §7)

### 5.7 `context/project-overview.md` env block

Add the `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` keys (the base Stripe keys
are already listed there).

---

## 6. Stripe Dashboard Setup

1. **Create the Product** — "CodeVault Pro".
2. **Add two recurring prices** on that product:
   - `$8.00` USD / **month** → copy price id → `STRIPE_PRICE_MONTHLY`.
   - `$72.00` USD / **year** → copy price id → `STRIPE_PRICE_YEARLY`.
3. **API keys** (Developers → API keys, **Test mode** first) → `STRIPE_SECRET_KEY`
   (`sk_test_…`) and publishable key (`pk_test_…`, reserved).
4. **Customer Portal** — enable it (Settings → Billing → Customer portal), allow
   cancellation + plan switching (monthly↔yearly), set business info + return URL.
5. **Webhook endpoint** — point to
   `https://<your-domain>/api/webhooks/stripe`, subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
     Copy the signing secret → `STRIPE_WEBHOOK_SECRET` (`whsec_…`).
6. **Local testing** — `stripe login`, then
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; use the
   `whsec_…` it prints as your local `STRIPE_WEBHOOK_SECRET`. Trigger events with
   `stripe trigger checkout.session.completed` etc. Test card `4242 4242 4242 4242`.

---

## 7. JWT `isPro` Sync (per research note)

Server reads already see live `isPro` (§1.3), so this is only for the client
session. Per the research prompt, add a `jwt()` callback to
[src/auth.ts](../src/auth.ts) that **always** re-reads `isPro`:

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) token.sub = user.id;
    if (token.sub) {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { isPro: true },
      });
      token.isPro = dbUser?.isPro ?? false;
    }
    return token;
  },
  session({ session, token }) {
    if (token.sub) session.user.id = token.sub;
    if (session.user) session.user.isPro = Boolean(token.isPro); // new
    return session;
  },
},
```

And augment the types in [src/types/next-auth.d.ts](../src/types/next-auth.d.ts):

```typescript
declare module "next-auth" {
  interface Session {
    user: { id: string; isPro: boolean } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    isPro?: boolean;
  }
}
```

> **Trade-off (from the note):** this adds one `user.findUnique` per session
> validation. Acceptable, and it guarantees a plain page reload after checkout
> reflects Pro status on the client. Because `getSessionUser()` already hits the
> DB, you _could_ skip this entirely and rely on server-rendered gating + a
> `router.refresh()` after redirect — decide based on whether any client
> component reads `useSession().data.user.isPro`.

---

## 8. Testing Checklist

**Automated (Vitest — run `npm test`):**

- [ ] `plan.ts` helpers (limits + interval lookups).
- [ ] `billing.ts` actions: unauth / already-Pro / not-configured / happy path.
- [ ] `sync.ts`: active→Pro, deleted→not-Pro, unknown customer no-op, idempotency.
- [ ] `createItem` / `createCollection` limit gating (Free at cap rejected, Pro ok).

**Manual (Test mode + `stripe listen`):**

- [ ] Free user sees Upgrade buttons on `/settings`; clicking → Stripe Checkout.
- [ ] Complete checkout with `4242…` → webhook fires → `User.isPro = true`,
      `stripeCustomerId`/`stripeSubscriptionId` populated → `/settings` shows Pro.
- [ ] Pro user sees **Manage subscription** → portal opens → cancel →
      `customer.subscription.deleted` → `isPro = false`.
- [ ] Monthly↔yearly switch in portal → `customer.subscription.updated` reconciles.
- [ ] Free user at 50 items / 3 collections gets the upgrade error; Pro unlimited.
- [ ] Free user's _file_ upload is blocked (402); _image_ upload still works.
- [ ] Webhook with a bad signature → 400; duplicate delivery → no double effect.
- [ ] `npm run build` + `npm run lint` clean.

---

## 9. Implementation Order

1. `npm install stripe`; add env keys; Dashboard product/prices/webhook (§6).
2. `src/lib/stripe/client.ts` + `src/lib/billing/plan.ts` (+ tests).
3. Webhook route + `src/lib/billing/sync.ts`; verify with `stripe listen` (+ tests).
4. `src/actions/billing.ts` + `checkoutSchema` (+ tests).
5. Billing UI (`BillingSection`, `UpgradeButtons`, `ManageSubscriptionButton`);
   wire into `/settings`.
6. Plan-limit gating in `createItem` / `createCollection` (+ tests).
7. Pro-gate file uploads (route + FILE branch).
8. _(Optional)_ JWT `isPro` sync + type augmentation (§7).
9. _(Optional)_ migration for `stripePriceId` / `stripeCurrentPeriodEnd` — Neon
   **development** branch only.
10. Full manual pass (§8); `npm test` + `npm run build`.

---

## 10. Notes & Decisions

- **Hosted Checkout + Portal** (not Elements) → no PCI surface, no
  `@stripe/stripe-js`, minimal UI. Best fit for a single Pro tier.
- **Webhook is the source of truth** for `isPro`, not the checkout success
  redirect (which can be closed/spoofed). Redirect only triggers a UI refresh.
- **`client_reference_id` + `subscription_data.metadata.userId`** both carry our
  user id so the webhook can resolve the user even before `stripeCustomerId` is
  saved (double-linked in `sync.ts`).
- **Idempotency:** all webhook handlers are safe to re-run; return 500 on handler
  errors so Stripe retries.
- **Neon safety:** any migration runs on **development** (`br-autumn-sunset-asqlkegf`)
  only — never production.

```

```
