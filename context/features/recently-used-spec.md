# Recently Used Page

## Overview

Add a /recent page displaying all recently used items and collections, using the
same card layout as the dashboard/home page (not a list view). The sidebar
already links here ("Recently Used", /recent) — this brings that link to life.

## Requirements

- Create /recent route with protection (AppShell layout, force-dynamic)
- Fetch all the user's items and collections (reuse getAllItems +
  getAllCollections, both ordered updatedAt desc — "recently used")
- Render a "Recent Items" section (ItemCard grid) and a "Recent Collections"
  section (CollectionCard grid), matching the dashboard's grids
- Click item opens ItemDrawer; click collection navigates to /collections/[id]
- Hide a section when empty; show an empty state when there is nothing at all

## UI Style

- Reuse the existing ItemCard / CollectionCard components and responsive grids
  from the dashboard — no new card design
- Page header with Clock icon + "Recently Used" title (mirror the pinned page)
