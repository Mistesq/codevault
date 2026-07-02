# CodeVault Homepage Mockup Spec

Create a marketing homepage for CodeVault - a developer knowledge hub for code snippets, AI prompts, commands, notes, files, images, and links.

**Output:** `prototypes/homepage/` with `index.html`, `styles.css`, `script.js`

**Design intent:** The page must visually match the REAL CodeVault product (see the dashboard
screenshot): layered near-black surfaces, neutral chrome, and thin item-type color accents.
It should read as intentionally designed by a human product team — NOT a louder, generic,
AI-generated marketing page. When in doubt, mirror the actual dashboard. The "Anti-Generic
Constraints" section at the bottom overrides anything above it if they ever conflict.

---

## Color Palette

Dark theme. **Single brand accent for marketing chrome: Blue `#3b82f6`** (the product logo
and the Snippet type already use it). Blue drives the primary CTA, one highlighted element per
section, and interactive states. No gradients anywhere.

The colors below are the **canonical item-type colors** (from `prisma/seed.ts` — source of
truth, match exactly). They encode a real product concept (each saved item type has a color)
and in the product appear as a **thin vertical left-border stripe** plus a tinted leading icon
on cards. Use them ONLY where a specific item type is shown (dashboard preview, item cards) —
never as generic decoration on marketing chrome (headings, section labels, feature cards).

| Type    | Lucide icon  | Hex       | Color  |
| ------- | ------------ | --------- | ------ |
| Snippet | `Code`       | `#3b82f6` | blue   |
| Prompt  | `Sparkles`   | `#8b5cf6` | violet |
| Command | `Terminal`   | `#f97316` | orange |
| Note    | `StickyNote` | `#fde047` | yellow |
| File    | `File`       | `#6b7280` | gray   |
| Image   | `Image`      | `#ec4899` | pink   |
| URL     | `Link`       | `#10b981` | green  |

Sidebar order (match the product): `snippet → prompt → command → note → file → image → url`.
Labels are **singular**; **File and Image show a PRO badge** (both are Pro-gated).

Surfaces: a layered near-black ramp (not flat `#000`) with neutral borders. Color comes only
from item types (in product UI) and the single blue accent.

---

## Hero Section (Main Focus)

"Chaos to order" concept, three elements. Use an **asymmetric layout** — text block
left-aligned, visual weighted to the right — not a fully centered stack.

### Chaos Container (Left)

Box labeled "Your knowledge today..." with 8 floating icons for where developers scatter
knowledge:

- Notion, GitHub, Slack, VS Code logos
- Browser tabs, Terminal, Text file, Bookmark icons

**Keep the bespoke animation** (a custom interaction like this reads as human effort, not a
template):

- Float around randomly, bouncing off walls
- Subtle rotation and scale pulsing
- Move away from the mouse cursor on hover

### Transform Arrow (Center)

A subtle pulsing arrow pointing from chaos to order. No neon glow / bloom.

### Dashboard Preview (Right)

Box labeled "...with CodeVault". **Use the real dashboard as the reference — ideally an actual
screenshot or a faithful replica, NOT gray skeleton placeholders.** Populate it with realistic
item titles, tags, and types.

- Sidebar with the 7 type rows in product order (`snippet → prompt → command → note → file →
image → url`), each with its tinted lucide icon and a per-type count; File and Image carry a
  PRO badge.
- Grid of item cards, each carrying its **item-type color as a thin left-border stripe** and a
  **tinted leading lucide icon** (`Code`, `Sparkles`, `Terminal`, `StickyNote`, `File`,
  `Image`, `Link`) — exactly as in the product. Card previews are monospace. This is the one
  place the multi-color system is correct, because here the colors actually mean something.

---

## Other Sections

1. **Navigation** - Fixed top nav with logo, "Features"/"Pricing" links, Sign In / Get Started.

2. **Hero Text** - Left of the visual: "Stop Losing Your Developer Knowledge" headline in a
   **solid color** (no gradient text — emphasize with weight or one blue accent word),
   subheadline about scattered knowledge, CTA buttons (flat, no glow).

3. **Features** - 6 cards in a grid: Code Snippets, AI Prompts, Instant Search, Commands,
   Files & Docs, Collections. Cards use a **single neutral border**, differentiated by icon
   and copy — NOT a per-card color. (No rainbow top borders. Item-type color stays in product
   UI, not on marketing feature cards.) Reuse the real lucide icons where a card maps to a type
   (Code Snippets → `Code`, AI Prompts → `Sparkles`, Commands → `Terminal`, Files & Docs →
   `File`), so the marketing icons match the app. The dashboard's top stat cards (68 Items /
   26 Collections / …) are a good reference for this neutral, icon-led card style.

4. **AI Section** - Two columns. Left: the AI capabilities. Right: a code editor mockup with an
   "AI Generated Tags" demo (keep tag colors inside the demo only, muted and uniform in
   weight). Present the capabilities (Auto-tagging, AI summaries, Explain Code, Prompt
   optimization) as **small cards or a clean two-line layout — NOT a green-checkmark + bold +
   em-dash list.** No ★ emoji badges; use a real icon or a plain label.

5. **Pricing** - Free ($0, 50 items, 3 collections) vs Pro ($8/mo, unlimited, AI features).
   Pro card highlighted with a "Most Popular" badge (no glow). Monthly / Yearly toggle with
   the yearly $72 option and its saving shown.

6. **CTA** - "Ready to Organize Your Knowledge?" with a flat button (no glow).

7. **Footer** - Logo, link columns, copyright with current year.

---

## Anti-Generic Constraints (highest priority)

These remove the specific tells that make a page look AI-generated. They override the section
descriptions above if anything conflicts.

1. **Match the product, don't invent.** Take palette, radii, spacing, typography, and the
   item-type accent treatment (left-border stripes) from the real dashboard.
2. **One accent (blue), not a rainbow.** Item-type colors appear only inside product UI
   (dashboard preview, tag demo). Everything else uses blue + neutrals.
3. **No gradient text anywhere.** Solid headline colors only.
4. **No decorative kickers.** Avoid a colored all-caps eyebrow before every section
   ("EVERYTHING, IN ONE PLACE", "SIMPLE PRICING"). Drop them or use a quiet, neutral label.
   No ★ emoji in badges.
5. **No glow / halo / neon bloom** on buttons, cards, or the CTA block. Flat and confident.
6. **Break the section rhythm.** Don't stack identical centered (kicker → big centered heading
   → centered subhead → grid) blocks. Left-align at least one section heading, and use the
   text-left / visual-right composition somewhere (the AI section already does this — treat it
   as the reference for the page's best composition).
7. **Real content over skeletons.** The hero dashboard shows realistic items / tags / types,
   matching the code-editor mockup's realism — no gray placeholder bars.
8. **Typography with character.** Match the product's UI font; use a display face with
   personality for large headings (e.g. Geist or a confident grotesk), tight negative
   letter-spacing on big text, and a consistent type scale. Avoid a plain default Inter look.

---

## Animations

- **Chaos icons**: JavaScript animation using requestAnimationFrame. Icons drift, bounce off walls, repel from mouse cursor.
- **Arrow**: CSS pulse animation (subtle, no glow)
- **Scroll**: Elements fade in when scrolling into view
- **Navbar**: Gets more opaque on scroll

---

## Responsive

- Mobile: Stack the chaos/arrow/dashboard vertically, single column grids
- Arrow rotates 90° on mobile to point down
- Feature grid reflows 3 -> 2 -> 1; asymmetric hero collapses cleanly to one column
