# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

## Goals

<!-- Goals & requirements -->

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
