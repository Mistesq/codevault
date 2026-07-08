// Canonical demo-account content — the single source of truth for what the
// public demo workspace looks like. Imported by BOTH the database seed script
// (prisma/seed.ts, fresh deploy) and the reset-on-login routine
// (src/lib/demo/reset.ts), so the "just seeded" and "just reset" states can
// never drift apart.
//
// Deliberately NOT server-only: prisma/seed.ts runs outside Next.js via tsx.
//
// Curation goals: showcase the product with zero visitor actions — several
// languages (syntax highlighting), tags on every item, AI-style descriptions
// pre-filled (real one-time output, no API quota spent on reset), favorites
// and pinned items, markdown notes — and enough real content that pagination
// is visible (> 21 snippets paginates /items/snippets; > 21 total paginates
// /items). Deliberately capped below the Free-plan limits (50 items,
// 3 collections) so visitors can still try the create flows.

export interface DemoSeedItem {
  title: string;
  /** System ItemType name, e.g. "snippet" / "prompt" / "command" / "note" / "URL". */
  typeName: string;
  content?: string;
  language?: string;
  url?: string;
  description: string;
  tags: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface DemoSeedCollection {
  name: string;
  description: string;
  isFavorite?: boolean;
  items: DemoSeedItem[];
}

export const DEMO_SEED_COLLECTIONS: DemoSeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable hooks and component patterns",
    isFavorite: true,
    items: [
      {
        title: "useDebounce hook",
        typeName: "snippet",
        language: "ts",
        description:
          "Custom React hook that delays updates to a fast-changing value until it settles, ideal for search inputs and autosave.",
        tags: ["react", "hooks", "typescript"],
        isFavorite: true,
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}`,
      },
      {
        title: "Theme context provider",
        typeName: "snippet",
        language: "tsx",
        description:
          "Typed React context provider with a companion hook that throws outside its provider, preventing silent null-context bugs.",
        tags: ["react", "context", "typescript"],
        content: `import { createContext, useContext, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(
  null,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}`,
      },
      {
        title: "useLocalStorage hook",
        typeName: "snippet",
        language: "ts",
        description:
          "State hook persisted to localStorage with lazy initialization and JSON serialization, safe against missing or corrupt stored values.",
        tags: ["react", "hooks", "browser"],
        content: `import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = (next: T) => {
    setValue(next);
    window.localStorage.setItem(key, JSON.stringify(next));
  };

  return [value, set] as const;
}`,
      },
      {
        title: "useOnClickOutside hook",
        typeName: "snippet",
        language: "ts",
        description:
          "Runs a handler when the user clicks or taps outside the referenced element — the standard building block for dropdowns and popovers.",
        tags: ["react", "hooks", "ui"],
        content: `import { useEffect, type RefObject } from "react";

export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}`,
      },
      {
        title: "useMediaQuery hook",
        typeName: "snippet",
        language: "ts",
        description:
          "Subscribes to a CSS media query with matchMedia and re-renders when it flips — handy for JS-side responsive behavior.",
        tags: ["react", "hooks", "responsive"],
        content: `import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}`,
      },
      {
        title: "usePrevious hook",
        typeName: "snippet",
        language: "ts",
        description:
          "Returns the value a state variable held on the previous render, using a ref that updates after paint.",
        tags: ["react", "hooks"],
        content: `import { useEffect, useRef } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}`,
      },
      {
        title: "useInterval hook",
        typeName: "snippet",
        language: "ts",
        description:
          "Declarative setInterval that always calls the latest callback and pauses when the delay is null.",
        tags: ["react", "hooks", "timers"],
        content: `import { useEffect, useRef } from "react";

export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}`,
      },
      {
        title: "useCopyToClipboard hook",
        typeName: "snippet",
        language: "ts",
        description:
          "Copies text via the async Clipboard API and exposes a short-lived `copied` flag for button feedback.",
        tags: ["react", "hooks", "browser"],
        content: `import { useCallback, useState } from "react";

export function useCopyToClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetAfterMs);
    },
    [resetAfterMs],
  );

  return { copied, copy };
}`,
      },
      {
        title: "cn() className utility",
        typeName: "snippet",
        language: "ts",
        description:
          "Merges conditional class names with clsx and resolves conflicting Tailwind utilities via tailwind-merge.",
        tags: ["tailwind", "utility"],
        content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      },
    ],
  },
  {
    name: "Ship & Deploy",
    description: "Docker, deploys, and reference docs",
    items: [
      {
        title: "Multi-stage Next.js Dockerfile",
        typeName: "snippet",
        language: "dockerfile",
        description:
          "Three-stage Docker build that keeps the production image lean by separating dependency install, build, and runtime layers.",
        tags: ["docker", "deployment"],
        content: `# Multi-stage build for a Next.js app
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]`,
      },
      {
        title: "Deploy to Vercel (production)",
        typeName: "command",
        language: "bash",
        description:
          "Pulls production env config, builds locally, then ships the prebuilt output to Vercel in one deploy.",
        tags: ["vercel", "deployment", "cli"],
        content: `npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod`,
      },
      {
        title: "Prune unused Docker resources",
        typeName: "command",
        language: "bash",
        description:
          "Frees disk space by removing stopped containers, dangling images, unused networks, and volumes in one sweep.",
        tags: ["docker", "cleanup"],
        content: "docker system prune -af --volumes",
      },
      {
        title: "Tailwind CSS documentation",
        typeName: "URL",
        url: "https://tailwindcss.com/docs",
        description:
          "Official utility-first CSS framework reference — classes, theming, and responsive design.",
        tags: ["css", "docs"],
      },
    ],
  },
];

/** Curated items that live outside any collection (still owned by the demo user). */
export const DEMO_SEED_STANDALONE_ITEMS: DemoSeedItem[] = [
  // ---------- TypeScript / JavaScript utilities ----------
  {
    title: "sleep() promise delay",
    typeName: "snippet",
    language: "ts",
    description:
      "One-liner that turns setTimeout into an awaitable promise for pacing async flows and tests.",
    tags: ["typescript", "async", "utility"],
    content: `export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));`,
  },
  {
    title: "chunk() array helper",
    typeName: "snippet",
    language: "ts",
    description:
      "Splits an array into fixed-size batches — useful for paginating work or limiting API payload sizes.",
    tags: ["typescript", "arrays", "utility"],
    content: `export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}`,
  },
  {
    title: "groupBy() helper",
    typeName: "snippet",
    language: "ts",
    description:
      "Groups array items into a record keyed by a selector function, with full type inference on the result.",
    tags: ["typescript", "arrays", "utility"],
    isFavorite: true,
    content: `export function groupBy<T, K extends PropertyKey>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      (acc[key(item)] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}`,
  },
  {
    title: "debounce() function",
    typeName: "snippet",
    language: "ts",
    description:
      "Framework-free debounce that postpones a function call until input stops arriving for the given delay.",
    tags: ["typescript", "utility", "performance"],
    content: `export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 300,
) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
  },
  {
    title: "throttle() function",
    typeName: "snippet",
    language: "ts",
    description:
      "Limits how often a function can run — at most once per interval — for scroll and resize handlers.",
    tags: ["typescript", "utility", "performance"],
    content: `export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  interval = 200,
) {
  let last = 0;
  return (...args: A) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn(...args);
    }
  };
}`,
  },
  {
    title: "formatBytes() human-readable sizes",
    typeName: "snippet",
    language: "ts",
    description:
      "Converts a raw byte count into a human-readable string (KB, MB, GB) with sensible precision.",
    tags: ["typescript", "formatting", "utility"],
    content: `export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return \`\${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} \${units[i]}\`;
}`,
  },
  {
    title: "slugify() URL-safe strings",
    typeName: "snippet",
    language: "ts",
    description:
      "Normalizes any title into a lowercase, dash-separated URL slug, stripping accents and punctuation.",
    tags: ["typescript", "strings", "utility"],
    content: `export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, "")
    .replace(/[\\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}`,
  },
  {
    title: "clamp() number helper",
    typeName: "snippet",
    language: "ts",
    description:
      "Constrains a number to a min/max range — the tiny helper every animation and pagination file ends up needing.",
    tags: ["typescript", "math", "utility"],
    content: `export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);`,
  },
  {
    title: "retry() with exponential backoff",
    typeName: "snippet",
    language: "ts",
    description:
      "Retries an async operation with doubling delays between attempts, rethrowing the last error when retries are exhausted.",
    tags: ["typescript", "async", "resilience"],
    content: `export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 250,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastError;
}`,
  },
  {
    title: "safeJsonParse() with fallback",
    typeName: "snippet",
    language: "ts",
    description:
      "JSON.parse that never throws: returns a typed fallback for malformed input instead of crashing the caller.",
    tags: ["typescript", "json", "utility"],
    content: `export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}`,
  },
  {
    title: "fetchJson() with timeout",
    typeName: "snippet",
    language: "ts",
    description:
      "fetch wrapper that aborts after a timeout and throws on non-2xx responses, returning parsed JSON.",
    tags: ["typescript", "fetch", "async"],
    content: `export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status} for \${url}\`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}`,
  },
  // ---------- Other languages ----------
  {
    title: "Read & write JSON files (Python)",
    typeName: "snippet",
    language: "python",
    description:
      "Minimal pathlib-based helpers for loading and saving JSON with UTF-8 encoding and pretty printing.",
    tags: ["python", "json", "files"],
    content: `import json
from pathlib import Path


def read_json(path: str | Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, data) -> None:
    Path(path).write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )`,
  },
  {
    title: "requests session with retries (Python)",
    typeName: "snippet",
    language: "python",
    description:
      "Requests session pre-configured with urllib3 Retry: exponential backoff on 429/5xx across common HTTP methods.",
    tags: ["python", "http", "resilience"],
    content: `import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def make_session(retries: int = 3) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "POST", "PUT", "DELETE"),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session`,
  },
  {
    title: "Find duplicate rows (SQL)",
    typeName: "snippet",
    language: "sql",
    description:
      "GROUP BY / HAVING query that surfaces duplicated values with their counts — the first step before adding a unique constraint.",
    tags: ["sql", "postgres", "data-quality"],
    content: `SELECT email, COUNT(*) AS occurrences
FROM users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;`,
  },
  {
    title: "Visually hidden CSS class",
    typeName: "snippet",
    language: "css",
    description:
      "Accessible .visually-hidden utility that removes content visually while keeping it available to screen readers.",
    tags: ["css", "accessibility"],
    content: `.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}`,
  },
  // ---------- Commands ----------
  {
    title: "Undo last commit (keep changes)",
    typeName: "command",
    language: "bash",
    description:
      "Soft-resets to the previous commit so the changes return to the staging area instead of being lost.",
    tags: ["git", "cli"],
    content: "git reset --soft HEAD~1",
  },
  {
    title: "Kill the process on a port",
    typeName: "command",
    language: "bash",
    description:
      "Finds whatever is holding a port (here 3000) and force-kills it so the dev server can start.",
    tags: ["terminal", "cli", "debugging"],
    content: "lsof -ti:3000 | xargs kill -9",
  },
  {
    title: "Clean reinstall of dependencies",
    typeName: "command",
    language: "bash",
    description:
      "Removes node_modules and the lockfile, then reinstalls from scratch — the reliable fix for corrupted installs.",
    tags: ["npm", "cli", "debugging"],
    content: "rm -rf node_modules package-lock.json && npm install",
  },
  {
    title: "Find the largest files in a repo",
    typeName: "command",
    language: "bash",
    description:
      "Lists the 20 biggest files under the current directory, human-readable and sorted — great for hunting bloat.",
    tags: ["terminal", "cli", "disk"],
    content: "du -ah . | sort -rh | head -n 20",
  },
  {
    title: "Generate an SSH key (ed25519)",
    typeName: "command",
    language: "bash",
    description:
      "Creates a modern ed25519 SSH key pair and prints the public half, ready to paste into GitHub or a server.",
    tags: ["ssh", "cli", "security"],
    content: `ssh-keygen -t ed25519 -C "you@example.com"
cat ~/.ssh/id_ed25519.pub`,
  },
  {
    title: "POST JSON with curl",
    typeName: "command",
    language: "bash",
    description:
      "Sends a JSON body with the right Content-Type header — the quickest way to poke an API endpoint from the terminal.",
    tags: ["curl", "http", "cli"],
    content: `curl -X POST https://api.example.com/items \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Hello", "tags": ["demo"]}'`,
  },
  // ---------- Prompts ----------
  {
    title: "Code review prompt",
    typeName: "prompt",
    description:
      "Structured code-review prompt that groups findings by severity and demands a concrete fix for each issue.",
    tags: ["ai", "code-review"],
    isPinned: true,
    content: `You are a senior software engineer performing a thorough code review.

Review the code below for: correctness, security, performance, and readability.
Return findings grouped by severity (Critical / Major / Minor), each with a
concrete suggested fix. End with a short overall assessment.

\`\`\`
{{code}}
\`\`\``,
  },
  {
    title: "Documentation generation prompt",
    typeName: "prompt",
    description:
      "Turns any code block into structured developer docs: summary, parameters, return value, edge cases, and a usage example.",
    tags: ["ai", "documentation"],
    content: `Generate clear developer documentation for the following code.

Include: a one-line summary, a description of what it does, parameters and their
types, the return value, edge cases, and a minimal usage example.

\`\`\`
{{code}}
\`\`\``,
  },
  {
    title: "Refactoring assistant prompt",
    typeName: "prompt",
    description:
      "Requests a behavior-preserving refactor with a bullet-point rationale for every change it makes.",
    tags: ["ai", "refactoring"],
    content: `Refactor the following code to improve readability and maintainability
WITHOUT changing its behavior. Prefer small, well-named functions and remove
duplication. List each change as a bullet with a one-line rationale.

\`\`\`
{{code}}
\`\`\``,
  },
  {
    title: "Commit message generator prompt",
    typeName: "prompt",
    description:
      "Produces a Conventional Commits message — typed subject line plus wrapped body — from a pasted diff.",
    tags: ["ai", "git", "workflow"],
    content: `Write a commit message for the diff below using the Conventional Commits
format: a "type(scope): summary" subject under 72 characters, a blank line,
then a short body explaining WHAT changed and WHY (wrap at 72 columns).
Choose the type from: feat, fix, chore, refactor, docs, test.

\`\`\`diff
{{diff}}
\`\`\``,
  },
  {
    title: "Unit test generator prompt",
    typeName: "prompt",
    description:
      "Generates a table-driven unit test suite covering the happy path, edge cases, and error handling for pasted code.",
    tags: ["ai", "testing"],
    isFavorite: true,
    content: `Write a unit test suite for the code below.

Cover: the happy path, boundary/edge cases, and error handling. Prefer
table-driven cases where sensible, mock external collaborators, and name each
test after the behavior it proves. Use the project's existing test framework
conventions if any are visible in the code.

\`\`\`
{{code}}
\`\`\``,
  },
  // ---------- Notes ----------
  {
    title: "Conventional commits cheatsheet",
    typeName: "note",
    description:
      "Quick reference for Conventional Commit prefixes with examples, including when a breaking-change footer is required.",
    tags: ["git", "workflow"],
    content: `# Conventional Commits

Format: \`type(scope): summary\`

## Types

| Type | Use for |
| --- | --- |
| \`feat\` | A new feature |
| \`fix\` | A bug fix |
| \`chore\` | Tooling, deps, config |
| \`refactor\` | Code change, no behavior change |
| \`docs\` | Documentation only |
| \`test\` | Adding or fixing tests |

## Examples

- \`feat(auth): add GitHub OAuth sign-in\`
- \`fix(items): clamp pagination to the last page\`
- \`chore: bump prisma to v7\`

> Breaking change? Add a \`BREAKING CHANGE:\` footer **and** a \`!\` after the
> type: \`feat(api)!: remove legacy export endpoint\`.`,
  },
  {
    title: "HTTP status codes quick reference",
    typeName: "note",
    description:
      "The status codes that actually come up in API work, grouped by class with one-line meanings.",
    tags: ["http", "api", "reference"],
    content: `# HTTP status codes worth memorizing

## 2xx — Success
- **200 OK** — standard success with a body
- **201 Created** — resource created (return a \`Location\` header)
- **204 No Content** — success, nothing to return (deletes)

## 3xx — Redirects
- **301 / 308** — moved permanently (308 keeps the method)
- **302 / 307** — temporary redirect (307 keeps the method)
- **304 Not Modified** — cache hit via \`ETag\` / \`If-None-Match\`

## 4xx — Client errors
- **400 Bad Request** — malformed input / validation failure
- **401 Unauthorized** — not authenticated
- **403 Forbidden** — authenticated but not allowed
- **404 Not Found** — also used to hide existence of a resource
- **409 Conflict** — duplicate / concurrent modification
- **422 Unprocessable Entity** — semantically invalid input
- **429 Too Many Requests** — rate limited (send \`Retry-After\`)

## 5xx — Server errors
- **500 Internal Server Error** — unhandled failure
- **502 / 504** — bad gateway / upstream timeout
- **503 Service Unavailable** — overloaded or down for maintenance`,
  },
  {
    title: "Git branching workflow",
    typeName: "note",
    description:
      "The lightweight feature-branch flow: branch from main, small commits, rebase before merge, delete after.",
    tags: ["git", "workflow"],
    content: `# Feature-branch workflow

1. **Branch off main** — \`git switch -c feature/short-name\`
2. **Commit small** — one logical change per commit, conventional messages
3. **Stay current** — \`git fetch origin && git rebase origin/main\`
4. **Open a PR** — small diffs review faster; link the issue
5. **Squash-merge** — keep main linear; the PR title becomes the commit
6. **Delete the branch** — locally and on the remote

## Handy commands

- Amend last commit: \`git commit --amend --no-edit\`
- Interactive cleanup before PR: \`git rebase -i origin/main\`
- Throw away local changes to a file: \`git restore path/to/file\``,
  },
  {
    title: "Semantic versioning rules",
    typeName: "note",
    description:
      "When to bump MAJOR, MINOR, or PATCH, plus how pre-release and range specifiers behave in npm.",
    tags: ["semver", "npm", "reference"],
    content: `# SemVer: MAJOR.MINOR.PATCH

- **MAJOR** — breaking API changes (\`2.0.0\`)
- **MINOR** — new features, backwards compatible (\`1.3.0\`)
- **PATCH** — bug fixes only (\`1.2.4\`)

## Pre-releases

\`1.0.0-alpha.1\` < \`1.0.0-beta.1\` < \`1.0.0-rc.1\` < \`1.0.0\`

## npm range specifiers

| Range | Allows |
| --- | --- |
| \`^1.2.3\` | 1.x.x updates (most common) |
| \`~1.2.3\` | 1.2.x patch updates only |
| \`1.2.3\` | exactly this version |

> Below 1.0.0, \`^0.2.3\` only allows 0.2.x — minor bumps are treated as
> breaking while the API is still unstable.`,
  },
  // ---------- URLs ----------
  {
    title: "MDN Web Docs",
    typeName: "URL",
    url: "https://developer.mozilla.org",
    description:
      "The canonical reference for web platform APIs: JavaScript, CSS, HTML, and browser compatibility tables.",
    tags: ["docs", "javascript", "css"],
  },
  {
    title: "Next.js documentation",
    typeName: "URL",
    url: "https://nextjs.org/docs",
    description:
      "Official Next.js docs — App Router, server components, caching, and deployment guides.",
    tags: ["docs", "react", "nextjs"],
  },
  {
    title: "regex101 — regex playground",
    typeName: "URL",
    url: "https://regex101.com",
    description:
      "Interactive regex tester with live explanation of every token, match highlighting, and a debugger.",
    tags: ["regex", "tools"],
  },
  {
    title: "Can I use — browser support tables",
    typeName: "URL",
    url: "https://caniuse.com",
    description:
      "Up-to-date browser support tables for CSS and web platform features, with usage statistics.",
    tags: ["css", "compatibility", "tools"],
  },
];

/** Every canonical demo item, collected and standalone alike. */
export function allDemoSeedItems(): DemoSeedItem[] {
  return [
    ...DEMO_SEED_COLLECTIONS.flatMap((collection) => collection.items),
    ...DEMO_SEED_STANDALONE_ITEMS,
  ];
}
