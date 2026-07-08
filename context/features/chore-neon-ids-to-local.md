# Chore: Move Neon Infrastructure Identifiers Out of Committed Files

## Status

Proposed

## Problem

The committed, publicly visible `CLAUDE.md` contains Neon infrastructure identifiers (project ID, production branch ID). These identifiers are not secrets — without a Neon API key they grant no access — but publishing production infrastructure identifiers in a public repository violates the attack-surface-minimization principle: leaked credentials elsewhere (a future key leak, a compromised dependency, CI logs) would combine with already-public identifiers into targeted access. It also contradicts the project's stated security-first posture, which is a credibility issue for a portfolio repository.

The identifiers exist in `CLAUDE.md` for a legitimate reason: the Neon MCP integration and agent workflows need them in context. The defect is the location (committed file), not the need.

## Requirements

### Functional

- All Neon identifiers are removed from every committed file (not only `CLAUDE.md`).
- Agent runtime context is unchanged: Claude Code must see the same identifiers and rules after the change as before.
- Security rules and guardrails (e.g. restrictions on destructive operations against the production branch) remain in the committed `CLAUDE.md`, reworded to be identifier-free.
- The committed `CLAUDE.md` notes that machine/account-specific values live in `CLAUDE.local.md`, so readers of the public repo understand the setup.

### Non-functional

- No git history rewrite and no credential rotation (see Design rationale).
- No changes to agent logic, MCP server configuration semantics, or `CLAUDE.md` structure beyond the identifier extraction.

## Design

### Mechanism

Claude Code natively supports `CLAUDE.local.md` at the project root for personal, per-project context that should not be committed: it loads alongside `CLAUDE.md` and is treated the same way. Moving identifiers there is therefore transparent to the agent — the combined context is identical — while the public repository no longer carries them.

### Changes

1. **Audit**: search all committed files for Neon identifiers — at minimum `CLAUDE.md`, `.mcp.json`, `.claude/agents/*`, `.claude/skills/*`, `context/**`, `README.md`. `.env*` files are out of scope (already gitignored). Findings outside `CLAUDE.md` get per-file fixes reviewed individually, since the right fix differs by file type (removal vs. env var reference vs. local file).
2. **Create `CLAUDE.local.md`**: header comment stating the file is gitignored and holds machine/account-specific values; Neon identifiers moved verbatim with their original structure/headings.
3. **Edit `CLAUDE.md`**: remove concrete identifiers; keep and reword guardrails (e.g. "never run destructive operations against the production branch; concrete project/branch IDs are defined in CLAUDE.local.md"); add one line pointing to `CLAUDE.local.md`.
4. **Gitignore**: add `CLAUDE.local.md` next to existing Claude Code entries (`.claude/agent-memory/`, `.claude/settings.local.json`).

### Key decisions and rationale

- **`CLAUDE.local.md` over env variables**: env vars would work for `.mcp.json` (`${VAR}` expansion) but not for prose context in `CLAUDE.md`; the local memory file is the mechanism designed for exactly this. Env vars remain the fallback for identifiers found in `.mcp.json` during the audit.
- **Verbatim move, same structure**: guarantees the agent's combined context is byte-equivalent in meaning, so existing Neon MCP workflows cannot silently break.
- **No history rewrite, no rotation**: the identifiers remain visible in old commits. This is accepted deliberately: they are identifiers, not credentials — the remediation goal is hygiene of the current state and signal, not leak containment. (Contrast: an actual secret in history would require rotation; history rewriting alone is insufficient since forks and clones retain it.)
- **Guardrails stay public**: the security rules are the valuable, reviewable part — they demonstrate that agent access to production infrastructure is bounded by explicit policy. Only the concrete coordinates move.

## Edge cases

- **`CLAUDE.local.md` accidentally committed**: would invert the purpose of the change. Mitigation: `git check-ignore CLAUDE.local.md` must pass, and `git status` must not list the file, before committing.
- **Identifiers embedded in agent prompts or specs**: agents finalized "with project context" may have absorbed IDs. Covered by the audit step; fixes reviewed per file.
- **Reworded guardrails losing meaning**: a rule like "never touch branch br-xxx" must not degrade into vagueness. Rules must reference roles ("the production branch") with resolution provided by `CLAUDE.local.md`. Manual review of the reworded rules is part of acceptance.
- **Git worktrees**: `CLAUDE.local.md` is not shared across worktrees of the same repo. Not applicable to the current single-checkout Windows setup; documented for awareness.

## Out of scope

- Git history rewriting (`filter-repo` etc.) and any credential rotation.
- Restructuring `CLAUDE.md` content beyond identifier extraction.
- Changes to `.env` handling or existing gitignore entries.
- Agent behavior changes.

## Acceptance criteria

- [ ] Audit report lists every committed file containing Neon identifiers; each finding is resolved or explicitly deferred with rationale.
- [ ] `grep` over the working tree (excluding gitignored files) finds no Neon project/branch identifiers in any committed path.
- [ ] `CLAUDE.local.md` exists locally, contains the identifiers with original structure, and `git check-ignore CLAUDE.local.md` confirms it is ignored.
- [ ] `CLAUDE.md` retains all security guardrails, reworded identifier-free, plus a pointer line to `CLAUDE.local.md`.
- [ ] Claude Code session smoke check: agent can still resolve the correct Neon project/branch for MCP operations (combined context intact).
- [ ] Commit on branch `chore/move-neon-ids-local` with a message explaining the hygiene rationale; history untouched.
