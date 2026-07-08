# Feature: GitHub Actions CI Pipeline

## Status

Proposed

## Problem

Quality gates (`npm run build` + lint before any commit) currently rely on local developer discipline. There is no infrastructure-level guarantee that code merged into `main` passes lint, tests, and build. This leaves the project exposed to a class of errors invisible on the local machine (uncommitted files, lockfile drift, path case-sensitivity between Windows and Linux) and weakens the portfolio narrative: the README claims quality gates, but nothing verifiable enforces them.

## Requirements

### Functional

- Every pull request targeting `main` and every push to `main` triggers an automated pipeline.
- The pipeline runs, in order: dependency install, Prisma client generation, lint, unit tests, production build.
- A failing step fails the entire pipeline and marks the PR check as failed.
- Outdated runs for the same branch/PR are cancelled when new commits are pushed.
- A CI status badge is displayed at the top of `README.md`.

### Non-functional

- No real secrets or production infrastructure identifiers in the workflow file. Lint, tests, and build must pass with dummy `DATABASE_URL` and `AUTH_SECRET` values (consistent with the project's minimal-env startup design).
- Single sequential job. No parallel jobs, matrix builds, Docker, or deploy steps.
- Total pipeline runtime under 10 minutes; hard timeout at 15.
- Reproducible installs: `npm ci`, never `npm install`.

## Design

### Workflow file

Location: `.github/workflows/ci.yml`

Baseline (adapt per Open questions below):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci_dummy
      AUTH_SECRET: ci-only-dummy-secret-do-not-use-anywhere
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma generate   # omit if postinstall handles it
      - run: npm run lint
      - run: npm test -- --run     # adapt to actual test script
      - run: npm run build
```

### Key decisions and rationale

- **Single sequential job over parallel lint/test/build jobs**: each parallel job repeats checkout + `npm ci` (~1–2 min overhead); at current project size the parallelism gain is seconds. Sequential is simpler to read and debug. Revisit if the pipeline grows (e.g. when e2e is added).
- **Dummy env vars over GitHub Secrets**: the app is designed to start with only `DATABASE_URL` and `AUTH_SECRET`; none of the CI steps require live infrastructure. Zero secrets in CI means zero secret-leak surface.
- **`concurrency` with `cancel-in-progress`**: repeated pushes to a PR should only run the latest commit.
- **Triggers on both PR and push to `main`**: PR runs are the actual gate; the push run keeps the README badge reflecting `main`, not the last PR.

### Open questions (resolve against the codebase before implementation)

1. Test runner and exact `test` script in `package.json`. If Vitest, the CI command must run in non-watch mode (`--run` or an existing `vitest run` script), otherwise the pipeline hangs indefinitely.
2. Whether `prisma generate` already runs via a `postinstall` script. If yes, drop the explicit step.
3. Target Node version (`engines` field, `.nvmrc`); default to 22 LTS if unspecified.
4. Default branch name (assumed `main`).

## Edge cases

- **Build-time DB access**: statically prerendered pages that query the database will fail `next build` against the dummy `DATABASE_URL` (connection refused). Verify locally by running `npm run build` with the same dummy values before pushing. If affected routes exist, mark them `export const dynamic = 'force-dynamic'` — list affected routes and get approval before changing them. Fallback only if `force-dynamic` is unacceptable for a route: a dedicated Neon `ci` branch with its URL stored as a GitHub Actions secret.
- **Watch-mode hang**: a test script that defaults to watch mode will hang until the 15-minute timeout kills it. Covered by Open question 1; the timeout is the safety net.
- **Windows/Linux path case-sensitivity**: imports that resolve locally on Windows may fail on the Linux runner. No mitigation needed — surfacing these is a goal of the pipeline, not a defect.
- **Duplicate Prisma generation**: if `postinstall` exists and the explicit step is kept, generation runs twice. Harmless but wasteful; covered by Open question 2.

## Out of scope

- e2e tests (Playwright) — planned as a follow-up second job in the same workflow.
- Deploy steps, Docker, caching beyond `setup-node` npm cache, matrix builds.
- Branch protection configuration (manual one-time action in GitHub UI after the first green run: require the `ci` check to pass before merging).

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` exists on `main` and matches the design above (with Open questions resolved).
- [ ] Opening a PR with a lint error, a failing test, or a build error produces a red check on the PR.
- [ ] A clean PR produces a green check; pipeline completes in under 10 minutes.
- [ ] `npm run build` succeeds in CI with dummy env vars (no real secrets present anywhere in the workflow or repo).
- [ ] CI badge at the top of `README.md` renders and reflects the status of `main`.
- [ ] (Post-merge, manual) Branch protection on `main` requires the `ci` check.
