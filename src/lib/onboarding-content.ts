/**
 * Starter content granted to every newly created account so the first
 * dashboard visit isn't empty. Pure data — the seeding itself lives in
 * src/lib/db/onboarding.ts.
 *
 * Only text-based types are used (File/Image need R2 uploads and a Pro plan).
 * Kept deliberately below the Free-tier caps: 2 of 3 collections, ~17 of 50
 * items, so a new Free user still has room to create their own.
 */

export interface StarterItem {
  title: string;
  /** System ItemType name ("snippet" | "prompt" | "command" | "note" | "URL"). */
  type: string;
  content?: string;
  language?: string;
  url?: string;
  description?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface StarterCollection {
  name: string;
  description: string;
  items: StarterItem[];
}

export const STARTER_COLLECTIONS: StarterCollection[] = [
  {
    name: "Getting Started",
    description: "A quick tour of what CodeVault can do — safe to edit or delete",
    items: [
      {
        title: "👋 Welcome to CodeVault",
        type: "note",
        description: "Start here — a two-minute tour of your new vault.",
        isPinned: true,
        isFavorite: true,
        content: `# Welcome to CodeVault 👋

Your personal hub for **snippets, prompts, commands, notes, files, images and links** — all searchable in one place.

## The basics

- **New Item** (top bar) creates anything: pick a type and the editor adapts.
- Press **⌘K / Ctrl+K** to search everything — items *and* collections.
- Click any card to open it in the **drawer**: copy, edit, tag, pin or delete without leaving the page.
- **Collections** group related items — one item can live in several collections.

## Make it yours

- ⭐ **Favorite** the things you reach for often (see the star page in the top bar).
- 📌 **Pin** items to keep them at the top of their lists and on the dashboard.
- 🏷️ **Tags** make search smarter — add a few when you save something.

## Going Pro unlocks

- 📎 File & image uploads
- 🤖 AI: auto-tagging, descriptions, *Explain Code* and prompt optimization
- ♾️ Unlimited items, collections and custom types

*This starter content is yours — edit it, reorganize it, or delete it all.*`,
      },
      {
        title: "Notes speak Markdown",
        type: "note",
        description: "Tables, task lists and code blocks — flip to Preview to see it rendered.",
        tags: ["markdown"],
        content: `Notes (and prompts) support **GitHub-Flavored Markdown**. Use the *Write / Preview* tabs above the editor.

## Task lists

- [x] Register an account
- [x] Open your first note
- [ ] Create an item of your own
- [ ] Build a collection

## Tables

| Shortcut | Action |
| --- | --- |
| ⌘K / Ctrl+K | Global search |
| Esc | Close the drawer |

## Code

\`\`\`ts
const vault = "organized";
\`\`\``,
      },
      {
        title: "Snippets get a real code editor",
        type: "snippet",
        language: "typescript",
        description:
          "Monaco (the VS Code editor) with syntax highlighting — change the language above the editor. Pro users can ask AI to Explain Code.",
        tags: ["typescript"],
        content: `// This is the same editor VS Code uses.
// Pick a language above — highlighting follows as you type.
export function groupBy<T, K extends PropertyKey>(
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
        title: "Prompts live here too",
        type: "prompt",
        description:
          "Store your best AI prompts once, reuse them everywhere. Pro users can one-click Optimize a prompt.",
        tags: ["ai"],
        content: `You are a senior engineer reviewing a pull request.

Analyze the diff below for correctness, security and readability.
Group findings by severity (Critical / Major / Minor) and suggest a
concrete fix for each. Finish with a one-paragraph overall assessment.

\`\`\`
{{diff}}
\`\`\``,
      },
      {
        title: "Commands are one click away",
        type: "command",
        language: "shell",
        description: "The copy button in the editor header puts this on your clipboard instantly.",
        tags: ["git"],
        content: "git log --oneline --graph --decorate --all",
      },
      {
        title: "URLs keep your links searchable",
        type: "URL",
        url: "https://nextjs.org/docs",
        description: "Save a link with a title and tags — no more digging through browser bookmarks.",
      },
    ],
  },
  {
    name: "Example Vault",
    description: "Real-world examples of what a lived-in vault looks like",
    items: [
      {
        title: "useDebounce hook",
        type: "snippet",
        language: "typescript",
        description: "Debounce a rapidly changing value.",
        isFavorite: true,
        tags: ["react", "hooks"],
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
        title: "cn() className utility",
        type: "snippet",
        language: "typescript",
        description: "Merge Tailwind classes without conflicts.",
        tags: ["react", "tailwind"],
        content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      },
      {
        title: "fetch with timeout",
        type: "snippet",
        language: "typescript",
        description: "AbortController-based fetch that gives up after a deadline.",
        tags: ["typescript"],
        content: `export async function fetchWithTimeout(
  url: string,
  ms = 8000,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}`,
      },
      {
        title: "Undo last commit (keep changes)",
        type: "command",
        language: "shell",
        description: "Soft reset to the previous commit.",
        tags: ["git"],
        content: "git reset --soft HEAD~1",
      },
      {
        title: "Kill the process on a port",
        type: "command",
        language: "shell",
        description: "Free up a port that is already in use.",
        tags: ["shell"],
        content: "lsof -ti:3000 | xargs kill -9",
      },
      {
        title: "Clean reinstall of dependencies",
        type: "command",
        language: "shell",
        description: "Nuke node_modules and the lockfile, then reinstall.",
        tags: ["node"],
        content: "rm -rf node_modules package-lock.json && npm install",
      },
      {
        title: "Commit message generator",
        type: "prompt",
        description: "Turn a diff into a conventional commit message.",
        isFavorite: true,
        tags: ["ai", "git"],
        content: `Write a conventional commit message (feat/fix/chore/refactor/docs)
for the following diff. One-line subject in imperative mood, max 72
characters, followed by a short body explaining the "why" only when it
isn't obvious from the subject.

\`\`\`
{{diff}}
\`\`\``,
      },
      {
        title: "Explain this error prompt",
        type: "prompt",
        description: "Paste any stack trace and get a plain-English diagnosis.",
        tags: ["ai", "debugging"],
        content: `Explain the following error to me:

1. What does it literally mean?
2. What are the three most common causes?
3. How do I confirm which cause applies to my case?

\`\`\`
{{error}}
\`\`\``,
      },
      {
        title: "New project checklist",
        type: "note",
        description: "The boring-but-critical steps every new repo needs.",
        tags: ["workflow"],
        content: `## Before the first feature

- [ ] \`.gitignore\` + \`.env.example\` committed, secrets out of git
- [ ] Linter + formatter configured and passing
- [ ] CI runs tests on every push
- [ ] README with setup steps a stranger could follow
- [ ] Error tracking wired up (Sentry or similar)
- [ ] Database migrations — never edit schema by hand`,
      },
      {
        title: "Tailwind CSS documentation",
        type: "URL",
        url: "https://tailwindcss.com/docs",
        description: "Utility-first CSS reference.",
        tags: ["css"],
      },
      {
        title: "shadcn/ui",
        type: "URL",
        url: "https://ui.shadcn.com",
        description: "Composable React component library.",
        tags: ["ui"],
      },
    ],
  },
];
