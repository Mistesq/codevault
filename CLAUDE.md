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

Whenever using the Neon MCP for this project, **always** target:

- **Project**: CodeVault — `old-rice-43499761`
- **Branch**: `development` — `br-autumn-sunset-asqlkegf`

Rules:

- Default every Neon query/operation to the **development** branch. Always pass
  its `branchId` (`br-autumn-sunset-asqlkegf`) explicitly — never rely on the
  default branch, since the default is production.
- **NEVER** touch the **production** branch (`br-blue-darkness-asren7eo`) — no
  reads, writes, schema changes, or migrations — unless I explicitly name
  "production" in my request.
- Never run destructive SQL (`DROP`, `DELETE`, `TRUNCATE`, `UPDATE`/`INSERT`
  without confirmation) or any branch/project deletion without asking me first,
  even on development.
- When you run a Neon operation, state which branch you used.
