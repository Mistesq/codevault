# Current Feature

<!-- Feature Name -->

Dashboard UI Phase 3 — Main Area

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

Phase 3 of 3 for the dashboard UI layout. Build out the main area to the right
of the sidebar using the mock data from `src/lib/mock-data.ts` (imported
directly until the database is in place). Use the reference screenshot as a base
(does not have to be exact).

- The main area to the right
- Recent collections
- Pinned items
- 10 recent items
- 4 stats cards at the top: number of items, collections, favorite items, and
  favorite collections (not in screenshot)

## Notes

<!-- Any extra notes -->

Spec: @context/features/dashboard-phase-3-spec.md

References:

- @context/screenshots/dashboard-ui-main.png
- @context/project-overview.md
- @src/lib/mock-data.ts
- @context/features/dashboard-phase-1-spec.md
- @context/features/dashboard-phase-2-spec.md

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Dashboard UI Phase 1 — shadcn/ui init (Tailwind v4) + button/input, dark mode by default, /dashboard route with top bar (display-only search + New Item) and Sidebar/Main placeholders; build passes
- Dashboard UI Phase 2 — functional sidebar from mock data: collapsible desktop icon rail (persisted via localStorage), mobile overlay drawer with hamburger toggle, type links to /items/TYPE, favorite & recent collections, and user avatar/footer area; build & lint pass
