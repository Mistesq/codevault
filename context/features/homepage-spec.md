# Homepage (App)

## Overview

Turn the static prototype in `prototypes/homepage/` into the real app homepage at
`/` (`src/app/page.tsx`, currently a placeholder `<h1>`). Same design, same
sections, same interactions — rebuilt as React server/client components using the
project's Tailwind v4 + shadcn stack, lucide-react icons, and existing shared
helpers. The prototype (`index.html` / `styles.css` / `script.js`) is the visual
source of truth; keep the layout, copy, spacing, and animations faithful.

## Requirements

Rebuild every prototype section, in order:

1. **Nav** — fixed top bar, brand, `Features` / `AI` / `Pricing` anchor links,
   `Sign in` + `Get started` actions. Opacity/blur increases on scroll.
2. **Hero** — asymmetric text-left layout, `knowledge` accent word, two CTAs,
   free-plan note, then the **chaos → arrow → dashboard** visual.
3. **Features** — 6 neutral-bordered cards (Code Snippets, AI Prompts, Instant
   Search, Commands, Files & Docs, Collections).
4. **AI** — two columns: capability cards left, code-editor + AI-tags demo right.
5. **Pricing** — Free vs Pro cards, "Most popular" badge, Monthly/Yearly toggle
   that swaps Pro's price ($8/mo ↔ $6/mo, $72/yr).
6. **CTA** — centered flat card with headline + button.
7. **Footer** — brand, three link columns, copyright with current year.

Preserve the prototype's animations and behavior:

- Chaos icons: `requestAnimationFrame` drift + wall-bounce + cursor-repel +
  rotation/scale pulse; pauses when the hero scrolls out of view.
- Arrow CSS pulse (rotates 90° on mobile).
- Scroll-reveal fade-in (IntersectionObserver).
- Navbar opacity on scroll; pricing toggle; footer year.
- Full `prefers-reduced-motion` fallback (static scatter, reveals shown).
- Responsive: chaos/arrow/dashboard stack, feature grid 3→2→1, AI collapses to
  one column, dashboard sidebar hides on the smallest breakpoint.

## Server / Client Split

Page is a **server component** (`src/app/page.tsx`) that calls `auth()` and
composes section components under `src/components/home/`. Keep sections server
components; push `"use client"` down to only the interactive leaves.

**Server components** (static markup): `HomeNav`, `Hero` (layout + copy +
`DashboardPreview`), `Features`, `AiSection` (+ editor mockup), `Pricing`
(static markup), `Cta`, `HomeFooter`.

**Client components** (interactivity only):

- `ChaosField` — the animated icon field (the `<div id="chaosField">` replacement);
  owns the rAF loop, mouse repel, resize + hero-visibility observers.
- `PricingToggle` — Monthly/Yearly state; renders the toggle and the price block
  it controls (replaces the `data-monthly`/`data-yearly` swap).
- Scroll behavior — either a small `NavScroll` client wrapper for the nav's
  `scrolled` state or a shared `useScrollReveal`/observer hook applied to
  `data-reveal` elements. Keep it one minimal client utility, not per-section.

## Links & Routing

Wire every prototype `href="#"` to the real destination (use `next/link` for
internal routes, plain `<a>` for on-page anchors):

- `Sign in` → `/sign-in`
- `Get started` / `Get started free` / `Upgrade to Pro` → `/register`
- `See how it works` → `#ai`; nav `Features`/`AI`/`Pricing` → `#features` /
  `#ai` / `#pricing`
- Brand → `#top` (or `/`); footer Product links → the same anchors.
- Footer Resources/Company links have no targets yet — render as non-navigating
  placeholders (`#`), don't invent routes.
- **Session-aware nav:** if `auth()` returns a session, replace `Sign in` +
  `Get started` with a single **Dashboard** button → `/dashboard`.

## Technical

- **Styling:** Tailwind utilities + shadcn `Button` (map prototype `btn-primary`
  → default, `btn-outline`/`btn-ghost` → variants) for layout, type, spacing.
  Match the prototype's existing token values — most already exist in
  `globals.css` (`--background`/`--card`/`--muted`, `--radius`, Geist fonts are
  global). Reuse them; don't hardcode hex where a token exists.
- **Item-type colors** (dashboard preview + feature/card accents) come from the
  canonical seed palette. Reuse `TypeIcon` / `getTypeIcon` from
  `src/lib/type-icons.tsx` for type icons; drive per-type color via a small
  shared map + CSS custom property (`style={{ "--c": color }}`), matching the
  prototype's `--t-*` stripe/tint pattern. Do not scatter item-type colors onto
  generic marketing chrome (headings, section labels) — blue accent + neutrals
  only there, per the mockup spec's anti-generic rules.
- **Icons:** `lucide-react` throughout (Vault, Code, Sparkles, Terminal,
  StickyNote, File, Image, Link, Search, Star, Pin, Clock, Folder, ArrowRight,
  Check, Wand2, FileText, plus Github/Slack/etc. for chaos icons) — replaces the
  prototype's inline SVG sprite.
- **Complex CSS** the prototype relies on (keyframes: `arrow-pulse`, `tag-in`;
  `.chaos-icon`, dashboard-replica classes) that don't map cleanly to utilities:
  port into a clearly-marked homepage section of `globals.css`. Keep it DRY — no
  duplicated per-card rules; use the `--c` custom-property approach.
- Metadata: set page-level `title`/`description` from the prototype `<head>`.
- No new server actions, DB queries, or dependencies. The only data touch is
  `auth()` for the signed-in nav swap.

## Out of Scope

- No real Stripe checkout / upgrade flow — Pricing buttons just link to
  `/register`.
- No new Resources/Company pages.
- Leave `prototypes/homepage/` in place as reference.

## Testing

No server actions or utilities with logic are added, so no new unit tests.
Verify visually in the browser against the prototype (desktop + mobile), confirm
animations + reduced-motion, and run `npm run build` + `npm run lint`.
