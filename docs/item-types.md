# Item Types

CodeVault ships **7 built-in (system) item types**, shared across all users
(`ItemType.isSystem = true`, `userId = null`). Every `Item` belongs to exactly
one type via `Item.typeId`. Custom item types are a **Pro** feature.

> **Sources:** `prisma/schema.prisma`, `prisma/seed.ts` (`SYSTEM_TYPES`),
> `src/lib/type-icons.tsx`, `src/lib/db/items.ts`, `src/components/dashboard/ItemCard.tsx`.
> Note: the research prompt referenced `src/lib/constants.tsx`, which does not
> exist — type metadata actually lives in `prisma/seed.ts` and `type-icons.tsx`.

---

## The 7 system types

Seeded in `prisma/seed.ts` → `SYSTEM_TYPES`. The `icon` value is a
[lucide-react](https://lucide.dev/icons) icon-name string, resolved to a
component in the UI via `getTypeIcon()` / `<TypeIcon>` in `src/lib/type-icons.tsx`.

| Type      | Icon (lucide) | Hex color | Swatch | Classification | Key fields used |
| --------- | ------------- | --------- | ------ | -------------- | --------------- |
| `snippet` | `Code`        | `#3b82f6` | 🔵 blue   | TEXT | `content`, `language` |
| `prompt`  | `Sparkles`    | `#8b5cf6` | 🟣 violet | TEXT | `content` |
| `command` | `Terminal`    | `#f97316` | 🟠 orange | TEXT | `content`, `language` (e.g. `bash`) |
| `note`    | `StickyNote`  | `#fde047` | 🟡 yellow | TEXT | `content` (markdown) |
| `file`    | `File`        | `#6b7280` | ⚪ gray   | FILE | `fileUrl`, `fileName`, `fileSize` |
| `image`   | `Image`       | `#ec4899` | 🩷 pink   | FILE | `fileUrl`, `fileName`, `fileSize` |
| `URL`     | `Link`        | `#10b981` | 🟢 green  | URL  | `url` |

> The seed stores this type as the literal name `"URL"` (uppercase); everywhere
> else it is matched case-insensitively (`name.toLowerCase()`).

### Per-type detail

#### `snippet` — `Code` · `#3b82f6`
Reusable code blocks for syntax-highlighted storage.
- **Purpose:** store code (hooks, utilities, components, Dockerfiles, etc.).
- **Key fields:** `content` holds the code; `language` drives syntax highlighting
  (e.g. `ts`, `tsx`, `dockerfile`). `contentType = TEXT`.

#### `prompt` — `Sparkles` · `#8b5cf6`
AI prompts and prompt templates.
- **Purpose:** save reusable LLM prompts/workflows (often with `{{placeholder}}`
  tokens).
- **Key fields:** `content` holds the prompt text. No `language`. `contentType = TEXT`.

#### `command` — `Terminal` · `#f97316`
Shell / CLI commands.
- **Purpose:** quick-reference terminal commands (git, docker, deploys).
- **Key fields:** `content` holds the command; `language` is typically `bash`.
  `contentType = TEXT`.

#### `note` — `StickyNote` · `#fde047`
Freeform notes and documentation.
- **Purpose:** markdown notes and write-ups (the project uses a markdown editor
  for text items).
- **Key fields:** `content` holds markdown. `contentType = TEXT`.

#### `file` — `File` · `#6b7280` · **Pro**
Arbitrary file uploads (docs, templates).
- **Purpose:** store uploaded files (Cloudflare R2 in the planned stack).
- **Key fields:** `fileUrl` (storage URL), `fileName`, `fileSize` (bytes).
  `contentType = FILE`.
- **Plan gating:** marked **Pro** in the sidebar (`ProBadge`).

#### `image` — `Image` · `#ec4899` · **Pro**
Image uploads.
- **Purpose:** screenshots, diagrams, design references.
- **Key fields:** `fileUrl`, `fileName`, `fileSize`. `contentType = FILE`.
- **Plan gating:** marked **Pro** in the sidebar. (Note: `project-overview.md`
  lists image uploads on the Free plan; the current UI badges Image as Pro —
  a discrepancy worth resolving.)

#### `URL` — `Link` · `#10b981`
Saved links / bookmarks.
- **Purpose:** documentation links and bookmarks.
- **Key fields:** `url`. Typically no `content`; `contentType = TEXT` (the FILE
  flag is reserved for uploaded files).

---

## Classification: TEXT vs FILE vs URL

There are **two layers** of classification:

1. **`ContentType` enum** (`prisma/schema.prisma`) — a storage-level flag on the
   item itself, defaulting to `TEXT`:
   - `TEXT` → content lives in the `content` column.
   - `FILE` → content is an uploaded asset (`fileUrl` / `fileName` / `fileSize`).
2. **The item's `ItemType`** — the semantic category (one of the 7 above).

Mapping of type → primary storage field:

| Group | Types | `contentType` | Primary field(s) |
| ----- | ----- | ------------- | ---------------- |
| **Text-based** | `snippet`, `prompt`, `command`, `note` | `TEXT` | `content` (+ `language` for snippet/command) |
| **File-based** | `file`, `image` | `FILE` | `fileUrl`, `fileName`, `fileSize` |
| **URL** | `URL` | `TEXT` | `url` |

`ContentType` only distinguishes TEXT vs FILE — there is **no dedicated `URL`
enum value**. URL items are stored as `TEXT` items whose data lives in the `url`
column, and are recognized by their `ItemType` and a populated `url`.

---

## Shared properties

All items share the `Item` model regardless of type
(`prisma/schema.prisma`, lines 45–75):

- **Identity / content:** `id`, `title`, `description`, `content`, `url`,
  `fileUrl`, `fileName`, `fileSize`, `language`, `contentType`.
- **State flags:** `isFavorite`, `isPinned`.
- **Relations:** `userId` → owner (cascade delete), `typeId` → `ItemType`,
  `collectionId` → optional `Collection` (set null on delete), `tags` →
  `ItemTag[]` (many-to-many with `Tag`).
- **Timestamps:** `createdAt`, `updatedAt`.
- **Indexes:** `@@index([userId])`, `@@index([collectionId])`.

Every type carries its own visual identity from `ItemType` (`name`, `icon`,
`color`), surfaced consistently in the sidebar and on cards.

---

## Display differences

### Content preview (`ItemCard.tsx` → `ContentPreview`)
The card preview branches on the item's data, **in this order**:

1. **File** (`contentType === "FILE"` and `fileName` present): shows the
   monospace file name plus a `·`-separated human-readable size
   (`formatFileSize`). → `file`, `image`.
2. **URL** (`url` present): shows an `ExternalLink` icon followed by the
   truncated URL in monospace. → `URL`.
3. **Text** (`content` present): renders `content` in a `<pre>` block
   (monospace, clamped to `max-h-24`). → `snippet`, `prompt`, `command`, `note`.
4. Otherwise renders nothing.

### Type icon + accent color
The card's leading icon badge renders `<TypeIcon name={item.type.icon}>` tinted
with the type's `color` via an inline style (data-driven, so it can't be a
static Tailwind class). `getTypeIcon()` falls back to the `File` icon for any
unrecognized icon name.

### Sidebar ordering & labels
- **Order** (`SYSTEM_TYPE_ORDER` in `src/lib/db/items.ts`):
  `snippet → prompt → command → note → file → image → url`. The DB has no sort
  column, so types are sorted in code by this list (unknown names fall to the
  end, alphabetically).
- Each sidebar type row shows a per-type item count, the colored icon, and a
  **PRO** badge on `file` and `image`.
- The sidebar uses **singular** type names.

### Profile "Items by Type" labels (`src/app/profile/page.tsx` → `typeLabel`)
The profile page renders **capitalized + pluralized** labels, with the `URL`
type relabeled to **"Links"** (e.g. `Snippets`, `Prompts`, `Commands`, `Notes`,
`Files`, `Images`, `Links`). This is a known minor inconsistency with the
sidebar's singular labels.
