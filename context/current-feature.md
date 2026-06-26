# Current Feature: Email Verification on Register

## Status

In Progress

## Goals

- On email/password registration, send a verification email via Resend with a
  unique link the user must click to verify their address.
- Clicking the link verifies the account (sets `User.emailVerified`) and lands
  on a clear success state.
- Unverified email/password users cannot sign in; they get a clear "verify your
  email" message instead of a generic error.
- GitHub OAuth users are unaffected (the adapter already marks them verified).
- A "resend verification email" action for users who didn't receive the email
  or whose link expired.

## Notes

- **Provider:** Resend. `RESEND_API_KEY` is set in `.env` / `.env.production`.
  `resend` is NOT yet a dependency — needs installing. Use Context7 for the
  current Resend + Auth.js email-verification docs at implement time.
- **Token store:** reuse the existing `VerificationToken` model
  (`identifier` = email, `token`, `expires`). Generate a cryptographically
  random token, set a short expiry (~24h), single-use (delete on verify).
- **Register flow:** `POST /api/auth/register` (`src/app/api/auth/register/route.ts`)
  currently creates the user and returns 201. Add: create token + send email
  after user creation. Keep the uniform responses (no enumeration).
- **Verify endpoint:** new `/verify-email?token=…` (likely a route handler or
  server component) → validate token + expiry, set `emailVerified = now()`,
  delete token, redirect to `/sign-in?verified=true` (toast on sign-in page).
- **Sign-in gate:** in `auth.ts` Credentials `authorize`, reject when
  `!user.emailVerified`. Surface a distinct, friendly "verify your email"
  message in the sign-in UI (without leaking whether the account exists).
- **Base URL:** use `NEXT_PUBLIC_APP_URL` (needs adding to env) to build absolute
  links in emails (e.g. https://codevault-gray.vercel.app locally fall back to
  http://localhost:3000).
- **From address:** Resend needs a verified sender/domain; use `onboarding@resend.dev`
  for dev and a configured `EMAIL_FROM` for prod.
- **Resend action (in scope):** a "resend verification email" endpoint + UI
  affordance on the sign-in / verify pages; rate-limit / invalidate prior tokens
  to avoid abuse.

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Dashboard UI Phase 1 — shadcn/ui init (Tailwind v4) + button/input, dark mode by default, /dashboard route with top bar (display-only search + New Item) and Sidebar/Main placeholders; build passes
- Dashboard UI Phase 2 — functional sidebar from mock data: collapsible desktop icon rail (persisted via localStorage), mobile overlay drawer with hamburger toggle, type links to /items/TYPE, favorite & recent collections, and user avatar/footer area; build & lint pass
- Dashboard UI Phase 3 — main area from mock data: 4 stats cards, pinned items, recent collections, and 10 recent items (reusable ItemCard/CollectionCard + dashboard-data selectors); moved brand onto the search row and fixed the sidebar footer clipping; build & lint pass
- Prisma + Neon PostgreSQL Setup — Prisma 7 (new `prisma-client` ESM generator + required `output`, `prisma.config.ts`, mandatory driver adapter) wired to Neon via `@prisma/adapter-pg`; full domain + Auth.js schema with indexes & cascade deletes; initial `init` migration created and applied; `src/lib/prisma.ts` singleton, `postinstall` generate, and `db:test` connectivity script; build & lint pass
- Database Seed Script — added `emailVerified` to User (migration `add_email_verified`); idempotent `prisma/seed.ts` seeds demo user (bcryptjs-hashed password), 7 system item types (URL→Link icon), and 5 collections / 18 items with real content; wired via `prisma.config.ts` `migrations.seed` + `db:seed` script; expanded `db:test` to fetch/display seed data with count checks; build & lint pass
- Dashboard Collections — Real Data — replaced mock "Recent Collections" with live Neon/Prisma data via `src/lib/db/collections.ts` (item count, distinct types, most-used-type border color); `/dashboard` now an async `force-dynamic` server component; `CollectionCard` redesigned for DB shape with data-driven border color + small type icons (shared `src/lib/type-icons.ts` resolver); items under collections deferred; build & lint pass
- Dashboard Items — Real Data — replaced mock pinned/recent items and stats with live Neon/Prisma data via `src/lib/db/items.ts` (`getPinnedItems`, `getRecentItems`, `getDashboardStats`, demo-user scoped; items carry embedded type icon/color + tag names, dates as ISO); `/dashboard` fetches items/stats/collections in parallel; `ItemCard` consumes the DB shape and renders the type icon via a new stable `TypeIcon` (type-icons `.ts`→`.tsx`); `StatsCards` takes DB stats as props; `dashboard-data.ts` trimmed to pure formatters (sidebar still on mock data, out of scope); build & lint pass
- Stats & Sidebar — Real Data — moved the sidebar fully onto Neon/Prisma data (no more `mock-data`): dashboard `layout.tsx` is now an async `force-dynamic` server component fetching sidebar data in parallel and passing it through `Sidebar` → `SidebarNav` as props; added `getSystemItemTypes` (with per-type item counts + custom `SYSTEM_TYPE_ORDER`: Snippet/Prompt/Command/Note/File/Image/URL) and `getSidebarItemCounts` to `items.ts`, `getFavoriteCollections` to `collections.ts`, and new `src/lib/db/user.ts` `getCurrentUser`; `SidebarNav` rewritten to consume props (type icons via shared `getTypeIcon`, per-type counts, favorites keep star, recents show a colored `TypeDot` by most-used type, added "View all collections" → `/collections`); `mock-data.ts` now unused (left in place); build & lint pass
- Add Pro Badge to Sidebar — added a clean, subtle uppercase "PRO" badge next to the File and Image item types in the sidebar to mark them Pro-only; added the shadcn/ui `Badge` component (`base-nova` style), gave `NavRow` an optional trailing `badge` slot (hidden in the collapsed icon rail), and a `secondary`-variant `ProBadge` whose transparent border fades to `border` on row hover via a named `group/navrow`; build & lint pass
- Demo-User Query Dedup — quick win from the full-codebase audit: replaced the ~9 independent `prisma.user.findUnique({ where: { email: DEMO_EMAIL } })` lookups across `items.ts`/`collections.ts`/`user.ts` with a single `getDemoUser()` resolver wrapped in React `cache()` (selects `id`/`name`/`isPro`), so a dashboard request resolves the demo user once instead of ~9 times; made `DEMO_EMAIL` a single exported constant in `user.ts`; output unchanged (consumers only read `user.id`, `getCurrentUser` keeps name/isPro); `mock-data.ts` left in place, all DB access stays on Prisma, no raw SQL; build & lint pass
- Auth Setup — NextAuth + GitHub Provider (Phase 1) — wired NextAuth v5 (`next-auth@5.0.0-beta.31`) + `@auth/prisma-adapter` using the split-config pattern: `src/auth.config.ts` (edge-safe, GitHub provider only), `src/auth.ts` (Prisma adapter via the existing `prisma` singleton + `session: { strategy: 'jwt' }`, `session` callback exposing `user.id` from `token.sub`), `src/app/api/auth/[...nextauth]/route.ts` (GET/POST handlers), `src/proxy.ts` (named `export const proxy = auth(...)`, dedicated adapter-free instance, `matcher: ['/dashboard/:path*']`, redirects unauthenticated users to NextAuth's default sign-in page), and `src/types/next-auth.d.ts` (Session `user.id`); verified locally — unauth `/dashboard` → 307 → `/api/auth/signin?callbackUrl=…`, sign-in page 200, GitHub in `/api/auth/providers`, and the full GitHub OAuth click-through (sign in → GitHub → back to `/dashboard`) verified; build & lint pass
- Auth Credentials — Email/Password Provider (Phase 2) — added a NextAuth Credentials provider alongside GitHub using the edge-safe split-config pattern: `auth.config.ts` holds a placeholder Credentials provider (`authorize: () => null`) so the proxy stays Prisma-free, and `auth.ts` overrides it (via `providers.map`, leaving the GitHub function reference untouched) with real `bcryptjs` validation — looks the user up, rejects OAuth-only/no-password accounts, `bcrypt.compare`, and returns `{id,email,name,image}` without the hash; returns `null` uniformly to avoid user enumeration. New `POST /api/auth/register` route (validate → dedupe by email `409` → bcrypt cost-12 hash → create `201`). Added `zod@4` with shared `signInSchema`/`registerSchema` in `src/lib/validations/auth.ts` (per coding standards). No migration needed (`User.password` already existed). Verified by curl: register `201`/duplicate `409`/validation `400`s, both providers in `/api/auth/providers`, credentials sign-in `302 → /dashboard` with `user.id` in session and `/dashboard` `200`, wrong password → `CredentialsSignin` + null session; build & lint pass
- Auth UI — Sign In, Register & Sign Out (Phase 3) — replaced the NextAuth default pages with branded UI and surfaced the signed-in user in the sidebar. New `(auth)` route group with a shared centered layout: custom `/sign-in` (`SignInForm`: email+password via client `signIn("credentials", { redirect: false })`, "Sign in with GitHub", inline errors, Zod validation, open-redirect-safe `callbackUrl` sanitizer, inline GitHub SVG since lucide dropped brand icons) and `/register` (`RegisterForm`: POSTs to the Phase-2 `/api/auth/register`, redirects to `/sign-in?registered=true`). Pointed NextAuth at the custom page via `pages: { signIn: "/sign-in" }`; `proxy.ts` now redirects unauth users to `/sign-in` and also protects `/profile`. Sidebar footer rewritten to a `UserMenu` (shadcn `DropdownMenu`) with a reusable image-or-initials `UserAvatar`, name/email, a Profile link and Sign out (`signOut({ callbackUrl: "/sign-in" })`); `getCurrentUser` now reads the real auth session (name/email/image) with a fresh `isPro` lookup (dashboard items/collections stay demo-scoped for now). Protected `/profile` stub shows the session user. Toast on successful registration ("Account created — you can now sign in.") via shadcn `sonner` (`Toaster` mounted in root layout, pinned to dark theme — removed the unused `next-themes` dep it pulled in). Added shadcn `dropdown-menu`/`avatar`/`label`/`sonner`; `.playwright-mcp/` gitignored. Verified end-to-end in the browser (register→toast→sign-in→dashboard avatar/dropdown→sign out; wrong-password inline error; `/dashboard` & `/profile` protection; GitHub button initiates OAuth); build & lint pass
- Fix: Dashboard Auth Bypass — closed a production hole where visiting `/dashboard` rendered the (demo-scoped) dashboard for unauthenticated visitors. Root cause: the dashboard route had no server-side session check and relied entirely on the proxy (`src/proxy.ts`), whose matcher isn't matching on prod (`/dashboard`, `/dashboard/foo`, `/profile/foo` all fall through — only `/profile` is gated, via `profile/page.tsx`'s own `auth()` redirect), while `getCurrentUser` silently fell back to a fake "User / Free plan". Fix: added a defense-in-depth `auth()` check + `redirect("/sign-in?callbackUrl=/dashboard")` to `dashboard/layout.tsx` (mirrors the proven `profile/page.tsx` pattern; per NextAuth v5 docs the proxy is an optimistic gate, not a substitute for page/layout session verification), and made `getCurrentUser` throw on a missing session instead of returning a placeholder identity. Follow-up: verify the proxy matcher after the next deploy. Verified locally — unauth `/dashboard` & `/dashboard/anything` → 307 → `/sign-in`; build & lint pass
