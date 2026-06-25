# Current Feature: Auth Credentials — Email/Password Provider (Phase 2)

## Status

In Progress

## Goals

- Add a Credentials provider for email/password authentication alongside the existing GitHub OAuth.
- Ensure the `User.password` field exists (add via migration if missing).
- `auth.config.ts`: add the Credentials provider with an `authorize: () => null` placeholder (edge-safe).
- `auth.ts`: override the Credentials provider with real bcryptjs validation logic.
- Create a registration API route at `POST /api/auth/register`.
- Sign in with email/password works and redirects to `/dashboard`; GitHub OAuth still works.

## Notes

- Use **bcryptjs** for hashing (already installed; seed script already hashes the demo user's password).
- **Registration API** `POST /api/auth/register`:
  - Accept `name`, `email`, `password`, `confirmPassword`.
  - Validate passwords match.
  - Check if a user with that email already exists.
  - Hash password with bcryptjs.
  - Create the user in the database.
  - Return a success/error response.
- **Credentials provider in the split pattern** (per the spec & Phase 1 architecture):
  - `auth.config.ts` (edge-safe): Credentials provider with `authorize: () => null` placeholder.
  - `auth.ts` (Node runtime, has Prisma adapter): override the Credentials provider with the actual bcrypt validation.
- Session strategy is already JWT (set in Phase 1), which is required for the Credentials provider.
- Reference: Credentials provider — https://authjs.dev/getting-started/authentication/credentials

### Testing
1. `curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","password":"password123","confirmPassword":"password123"}'`
2. Go to `/api/auth/signin`
3. Sign in with email/password
4. Verify redirect to `/dashboard`
5. Verify GitHub OAuth still works

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
