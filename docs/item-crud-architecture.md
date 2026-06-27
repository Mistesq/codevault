# Item CRUD Architecture

A unified design for create / read / update / delete across all **7 item types**
(`snippet`, `prompt`, `command`, `note`, `file`, `image`, `URL`). One action
file owns mutations, `lib/db` owns reads, a single dynamic route renders every
type, and shared components adapt their fields by type.

> **Status:** design proposal. None of the `/items` routes,
> `src/actions/items.ts`, or item-CRUD components exist yet — this documents the
> intended architecture, mirroring patterns already established by the auth /
> profile code.
>
> **Source notes:** the prompt referenced `@docs/content-types.md` and
> `@src/lib/constants.tsx`, neither of which exists. The equivalent material is
> in [docs/item-types.md](item-types.md) (the 7 types, icons, colors,
> TEXT/FILE/URL classification) and `prisma/seed.ts` / `src/lib/type-icons.tsx`.
> Patterns below are drawn from `src/actions/profile.ts`,
> `src/lib/validations/auth.ts`, `src/lib/db/items.ts`, and
> `src/components/dashboard/*`.

---

## 1. Guiding principles

1. **Mutations in one server-action file** — `src/actions/items.ts` holds
   `createItem`, `updateItem`, `deleteItem` (plus toggles). All 7 types flow
   through the same three actions; the `typeId` is just data on the row.
2. **Reads in `lib/db`, called directly from server components** — no fetch
   layer. `src/lib/db/items.ts` already does this for the dashboard; the list
   and detail views extend it.
3. **One dynamic route** — `/items/[type]` renders the list for any type (or
   "all"); a nested `/items/[type]/[id]` renders one item. The route segment is
   presentation only.
4. **Type-specific logic lives in components, not actions** — the action
   validates and writes whatever fields it's given. *Which* fields exist, how
   they're labeled, and how content is previewed is decided by a type→config map
   the components read. Adding a behavior tweak for, say, `snippet` touches a
   component/config, never the action.

This matches the coding standards: Server Actions for mutations, server
components fetch directly with Prisma, validate with Zod, return
`{ success, data?, error? }`.

---

## 2. File structure

```
src/
  app/
    items/
      layout.tsx                 # AppShell wrapper (auth + sidebar), callbackUrl="/items"
      page.tsx                   # "All Items" grid (no type filter)
      new/
        page.tsx                 # Create form (optional ?type= preselect)
      [type]/
        page.tsx                 # List for one type, e.g. /items/snippets
        [id]/
          page.tsx               # Item detail / view
          edit/
            page.tsx             # Edit form
  actions/
    items.ts                     # ALL mutations: create/update/delete/toggles  ("use server")
  lib/
    db/
      items.ts                   # READS (extend existing): list/detail/by-type
    validations/
      item.ts                    # Zod schemas: createItemSchema, updateItemSchema
    item-types.ts                # NEW: slug<->type resolution + per-type field config
  components/
    items/
      ItemGrid.tsx               # Server: maps items -> ItemCard (reuses dashboard ItemCard)
      ItemForm.tsx               # Client: shared create/edit form, adapts fields by type
      ItemFormFields.tsx         # Client: the type-specific field set (snippet vs file vs url …)
      ItemDetail.tsx             # Server: full view, adapts rendering by type
      ItemActions.tsx            # Client: edit/delete/favorite/pin buttons -> calls actions
      DeleteItemDialog.tsx       # Client: confirm + calls deleteItem (alert-dialog pattern)
      ItemTypePicker.tsx         # Client: choose type when creating from /items/new
```

Reuses existing pieces:
- `src/components/dashboard/ItemCard.tsx` — already renders any type's preview
  (file → name+size, url → link, else code `<pre>`). The grid feeds it.
- `src/components/dashboard/AppShell.tsx` — the signed-in shell; `/items/layout.tsx`
  wraps children in it exactly like `dashboard/layout.tsx` and `profile/layout.tsx`.
- `src/lib/type-icons.tsx` — `getTypeIcon` / `<TypeIcon>` for the per-type icon.

---

## 3. Routing: how `/items/[type]` works

### Slugs
The sidebar already links types as **plural, lowercase slugs**
(`SidebarNav.tsx` → `typeSlug = ${name.toLowerCase()}s`):

| ItemType.name | Slug (`/items/[type]`) |
| ------------- | ---------------------- |
| `snippet` | `/items/snippets` |
| `prompt`  | `/items/prompts` |
| `command` | `/items/commands` |
| `note`    | `/items/notes` |
| `file`    | `/items/files` |
| `image`   | `/items/images` |
| `URL`     | `/items/urls` |

Plus the non-type sidebar destinations that the same route family should cover:
`/items` (All), and sibling routes `/favorites`, `/pinned`, `/recent`,
`/collections/[id]` (out of scope here but share `ItemGrid`).

### Slug ⇄ type resolution (`src/lib/item-types.ts`)
A single helper resolves a URL slug back to the canonical `ItemType.name`, so
routing and DB stay in sync and bad slugs 404:

```ts
// pseudocode
export const TYPE_SLUGS = {
  snippets: "snippet", prompts: "prompt", commands: "command",
  notes: "note", files: "file", images: "image", urls: "URL",
} as const;

export function typeNameFromSlug(slug: string): string | null { … }
export function slugFromTypeName(name: string): string { … } // matches SidebarNav
```

`typeSlug` / `typeLabel` currently live inline in `SidebarNav.tsx`; this design
**lifts them into `lib/item-types.ts`** so the sidebar, routes, and forms share
one source of truth.

### `app/items/[type]/page.tsx` flow
1. Read `params.type` (the slug), resolve to a type name via `typeNameFromSlug`.
   If `null` → `notFound()`.
2. Call a `lib/db` reader scoped to the **signed-in user** + that type.
3. Render `<ItemGrid items={…} />`, an "empty state" + a "New {Type}" button
   pointing at `/items/new?type={slug}`.
4. `export const dynamic = "force-dynamic"` (same as the dashboard), since data
   is per-user and mutable.

The route segment carries the type **only as a slug** — no type-specific
branching in the page. It hands the resolved type to the reader and the
components.

---

## 4. Mutations — `src/actions/items.ts` (`"use server"`)

One file, the three core verbs plus small toggles. Each follows the established
`profile.ts` shape exactly:

- `ActionResult<T> = { success: true; data?: T } | { success: false; error: string }`
- `auth()` session check first → `{ success: false, error: "You must be signed in." }`
- Zod `safeParse` of the input → first issue message on failure
- `try/catch` around Prisma, `console.error` + generic message on throw
- **Always scope writes to the caller's own `userId`** (never trust a client id)

```ts
createItem(input)            // validate -> enforce limits/Pro -> prisma.item.create
updateItem(id, input)        // verify ownership -> prisma.item.update (scoped by id+userId)
deleteItem(id)               // verify ownership -> prisma.item.delete
toggleFavorite(id) / togglePin(id)   // small ownership-scoped updates
```

Cross-cutting concerns that belong in the **action** (not components):

- **Ownership:** every update/delete uses `where: { id, userId }` (or a fetch-then-check)
  so users can only mutate their own items — same principle as
  `deleteAccount` scoping to `session.user.id`.
- **Free-tier limits:** `createItem` enforces the 50-item cap for non-Pro users
  (count items, reject with a friendly error) — server-side is the source of truth.
- **Pro gating:** creating a `file` / `image` item (FILE types) or a custom type
  requires `isPro`; reject otherwise.
- **`revalidatePath`** for `/items`, `/items/[type]`, and `/dashboard` after a
  successful mutation so server-rendered grids refresh.

The action stays **type-agnostic**: it persists whatever validated fields it
receives. It does not contain `if (type === "snippet") …` branches — that lives
in validation config and components.

---

## 5. Reads — `src/lib/db/items.ts` (extend existing)

The file already exports `getPinnedItems`, `getRecentItems`,
`getDashboardStats`, `getSystemItemTypes`, `getSidebarItemCounts`, plus the
shared `itemSelect` projection and `DashboardItem` shape. Add list/detail
readers that reuse the same `itemSelect` and `toDashboardItem` mapper:

```ts
getItemsByType(typeName, opts)   // list view: where { userId, type: { name } }
getAllItems(opts)                // /items
getFavoriteItems() / getPinnedItems()  // (pinned already exists)
getItemById(id)                  // detail/edit: scoped to userId, full content
```

These are plain async functions imported directly by the server components — no
API routes (consistent with "server components fetch directly with Prisma").

> **Scoping note / decision point:** every reader here currently scopes to
> `getDemoUser()`. Real CRUD must scope to the **signed-in** user
> (`auth().user.id`). The cleanest path is a `getCurrentUserId()` helper in
> `lib/db/user.ts` and swapping `getDemoUser()` for it in these readers. This is
> the main migration this feature forces; call it out before implementing.

File uploads (`file` / `image`, → Cloudflare R2) need an upload step before the
DB write — likely an **API route** (`app/api/items/upload/route.ts`) per the
coding standards ("API routes for file uploads with progress"), with
`createItem` then storing the returned `fileUrl` / `fileName` / `fileSize`. Text
and URL types need no API route and go straight through the Server Action.

---

## 6. Validation — `src/lib/validations/item.ts`

A discriminated, type-aware Zod schema so each type validates only its relevant
fields, while the action calls one `safeParse`:

- Shared base: `title` (required), `description?`, `collectionId?`, `tags?`.
- TEXT types (`snippet`, `prompt`, `command`, `note`): require `content`;
  `snippet`/`command` also accept `language`.
- URL type: require a valid `url`.
- FILE types (`file`, `image`): require `fileUrl` / `fileName` / `fileSize`
  (populated post-upload).

`createItemSchema` / `updateItemSchema` (update = partial + `id`) live here next
to `auth.ts`, matching the "validate all inputs with Zod" standard. The
per-type field requirements are data (a map keyed by type name) so the **form**
and the **schema** derive from the same config.

---

## 7. Where type-specific logic lives (components + config)

A single **type-config map** (in `lib/item-types.ts`) is the one place that
encodes per-type differences; every component reads it:

```ts
// pseudocode shape
type ItemTypeConfig = {
  name: string;            // "snippet"
  slug: string;            // "snippets"
  label: string;           // "Snippet"
  fields: FieldKind[];     // which form fields to show: ["content","language"]
  contentType: "TEXT" | "FILE";
  isPro: boolean;          // file/image
};
```

- **No type switch in actions or the route.** The route resolves a slug; the
  action persists validated data. All "snippet has a language, file has an
  upload, url has a link field" knowledge is in the config + the form.
- Icons/colors come from the DB (`ItemType.icon/color`) via `type-icons.tsx`,
  not hardcoded per component.

---

## 8. Component responsibilities

| Component | Type | Responsibility |
| --------- | ---- | -------------- |
| `app/items/[type]/page.tsx` | Server | Resolve slug→type (`notFound()` on miss), call `getItemsByType`, render grid + empty state + "New" button. |
| `ItemGrid` | Server | Map `DashboardItem[]` → existing `ItemCard`. No type logic; `ItemCard` already adapts its preview. |
| `ItemCard` (existing) | Server | Per-type preview (file name+size / url+icon / code `<pre>`), type icon+color, favorite/pin flags. **Reused as-is.** |
| `ItemForm` | Client | Shared create/edit shell: title/description/tags/collection, submit → `createItem`/`updateItem`, inline errors via the `ActionResult` pattern, toast on success (`sonner`). |
| `ItemFormFields` | Client | Renders the **type-specific** fields from the type config (content+language for code, link for URL, upload for file/image). The only place that branches on type for input. |
| `ItemTypePicker` | Client | On `/items/new`, pick the type (or preselect from `?type=`); gates Pro types behind the upgrade prompt. |
| `ItemDetail` | Server | Full single-item view; renders content per type (syntax-highlighted code, rendered markdown for notes, link for URL, file/image embed). |
| `ItemActions` | Client | Edit link + delete (via `DeleteItemDialog`) + favorite/pin toggles, calling the actions; mirrors profile dialogs. |
| `DeleteItemDialog` | Client | `alert-dialog` confirm → `deleteItem`; same pattern as `DeleteAccountDialog`. |

---

## 9. End-to-end flow examples

**Browse snippets** → `/items/snippets`
`page.tsx` resolves `snippets`→`snippet`, `getItemsByType("snippet")` (scoped to
the signed-in user) → `<ItemGrid>` → existing `ItemCard`s.

**Create a URL item** → `/items/new?type=urls`
`ItemTypePicker` preselects URL → `ItemForm` shows the link field
(`ItemFormFields` from config) → submit → `createItem` validates with the
url branch of `createItemSchema`, enforces the free-tier cap, writes
`contentType: TEXT` + `url`, `revalidatePath("/items/urls")` → redirect to the
detail page.

**Delete an item** → `ItemActions` → `DeleteItemDialog` → `deleteItem(id)`
verifies `where: { id, userId }`, deletes, revalidates the list.

---

## 10. Open decisions to confirm before building

- **User scoping migration:** move `lib/db/items.ts` readers from `getDemoUser()`
  to the signed-in user (§5). Affects the dashboard too.
- **File uploads:** confirm the R2 upload route + how `fileUrl` is produced
  before `createItem` runs (FILE types only).
- **Free-tier / Pro enforcement point:** confirmed server-side in `createItem`;
  decide the matching client UX (disable vs. upgrade prompt).
- **Sibling routes** (`/favorites`, `/pinned`, `/recent`) reuse `ItemGrid` +
  new readers — in scope of the same components, separate pages.
- **Lift `typeSlug`/`typeLabel`** out of `SidebarNav.tsx` into `lib/item-types.ts`
  so the sidebar and routes can't drift.
