# Pinned Page

## Overview

Add a /pinned page displaying all pinned items in one place, using the same
card layout as the pinned items section on the dashboard/home page.

## Requirements

- Add pin icon button to TopBar linking to /pinned
- Create /pinned route with protection
- Fetch all user pinned items
- Reuse the existing pinned-items card layout from the dashboard (same ItemCard grid)
- Click item opens ItemDrawer
- Empty state when no pinned items
- Sort by most recently pinned (updatedAt)

## UI Style

- Reuse the existing ItemCard component and responsive grid from the dashboard
  pinned section — no new card design
- Consistent spacing/columns with the rest of the app's card grids
