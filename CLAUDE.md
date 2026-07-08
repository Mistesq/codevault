@AGENTS.md

# CodeVault

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- **Dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm run start`
- **Lint**: `npm run lint`
- **Test (once)**: `npm test` (Vitest — server actions & utilities only)
- **Test (watch)**: `npm run test:watch`

## Neon MCP — Database Access Rules

Concrete Neon project/branch identifiers are machine/account-specific and live
in `CLAUDE.local.md` (gitignored; copy `CLAUDE.local.md.example` to create it).
The rules below reference branches by role; resolve the actual IDs from that
file.

Rules:

- Default every Neon query/operation to the **development** branch. Always pass
  the development branch's `branchId` (from `CLAUDE.local.md`) explicitly —
  never rely on the default branch, since the default is production.
- **NEVER** touch the **production** branch — no reads, writes, schema changes,
  or migrations — unless I explicitly name "production" in my request.
- Never run destructive SQL (`DROP`, `DELETE`, `TRUNCATE`, `UPDATE`/`INSERT`
  without confirmation) or any branch/project deletion without asking me first,
  even on development.
- When you run a Neon operation, state which branch you used.
