# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Stripe, GitHub, etc.)
  - File uploads with progress tracking
  - Long-running operations
  - Specific HTTP status codes or headers
  - Endpoints for future mobile/CLI clients
  - Third-party integrations
- Otherwise, fetch data directly in server components
- Dynamic routes for item/collection pages

## Architecture & Separation of Responsibility

Core rule: **one file, one responsibility**, and **components only render UI** — they do not "think."

A component MUST NOT contain:

- Database or API calls (Prisma, `fetch`, or calling a Server Action just to _load_ data)
- Domain/business logic (plan gating, permission checks, derived domain values, dedupe rules)
- Data transformations that reshape domain data (`.map`/`.filter`/`.reduce`/sort/group into a new shape)
- Utilities (date formatting with `dayjs`, parsing, regex)

A component MAY contain presentational logic: conditional class names, show/hide by prop, ternaries for display text, and event handlers.

A component receives its data through props (from a Server Component, hook, or Server Action). It does not fetch its own data.

Where extracted code goes:

- Domain derivations & formatters → `src/lib/[feature]` (e.g. `getItemLabel`, `isItemLocked`, `formatItemDate`)
- Validation schemas → `src/lib/validations`
- Data access → `src/lib/db` (reads) and `src/actions` (mutations)
- Reusable client logic → a custom hook (`use*`)

**Any violation of separation of responsibility is an architecture error. Refactor it before continuing the task — do not defer it.**

### Layer boundaries

- `src/actions` and `src/lib/db` are **server-only**. Never import them into a `'use client'` component. Add `import "server-only"` to server-only modules to enforce this at build time.
- `src/components/ui` holds **pure primitives** with no domain knowledge (buttons, inputs, dialogs). Feature/domain UI lives in `src/components/[feature]`.
- Keep route files thin: `src/app/**/page.tsx` only composes the page and passes data down. Page assembly and orchestration live in components, not in the route file.

### Separation review checklist

Applied to every changed component — a "yes" to any item means refactor before continuing (also used as the `code-scanner` agent's modularity rubric):

- Does it call the DB / an API / a data-loading action directly?
- Does it compute a domain rule or a derived domain value?
- Does it reshape domain data (map/sort/group into a new structure)?
- Does it define a utility (formatting, parsing) inline instead of importing one?
- Does the file do more than one thing?

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive in `src/app/globals.css`
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

## File Organization

- Components: `src/components/[feature]/ComponentName.tsx`
- Pages: `src/app/[route]/page.tsx`
- Server Actions: `src/actions/[feature].ts`
- Types: `src/types/[feature].ts`
- Lib/Utils: `src/lib/[utility].ts`

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Use shadcn/ui components where applicable
- No inline styles
- Dark mode first, light mode as option

## Database

- Use Prisma ORM for all database operations
- Always use `prisma migrate dev` for schema changes (not `db push`)
- Run `prisma migrate status` before committing to verify migrations are in sync
- Production deployments must run `prisma migrate deploy` before the app starts

## Data Fetching

- Server components fetch directly with Prisma
- Client components use Server Actions
- Validate all inputs with Zod

## Error Handling

- Use try/catch in Server Actions
- Return `{ success, data, error }` pattern from actions
- Display user-friendly error messages via toast

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
