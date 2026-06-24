# Current Feature

Dashboard Items — Real Data

## Status

Completed

## Goals

Replace the dummy item data in the dashboard main area (pinned and recent items) with real data from the Neon database via Prisma, instead of `src/lib/mock-data.ts`. The layout and design stay the same — reference `context/screenshots/dashboard-ui-main.png` if needed.

- Create `src/lib/db/items.ts` with data fetching functions
- Fetch items directly in the server component
- Derive the item card icon/border from the item type
- Display item type tags and everything currently shown on the cards
- If there are no pinned items, render nothing in the pinned section
- Update the collection stats display

## Notes

<!-- Any extra notes -->

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
