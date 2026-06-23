// Single source of truth for dashboard mock data.
// Temporary stand-in until the database is wired up. Shapes loosely follow the
// Prisma draft in context/project-overview.md so the migration stays easy.

export type ContentType = "TEXT" | "FILE";

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  // lucide-react icon name, resolved in the UI
  icon: string;
  color: string;
  isSystem: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
}

export interface Item {
  id: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  content: string | null;
  fileName: string | null;
  fileSize: number | null;
  url: string | null;
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  typeId: string;
  collectionId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Current user ----------

export const currentUser: User = {
  id: "user_1",
  name: "Jordan Diaz",
  email: "demo@codevault.io",
  image: null,
  isPro: true,
};

// ---------- System item types ----------

export const itemTypes: ItemType[] = [
  { id: "type_snippet", name: "Snippet", icon: "Code2", color: "#60a5fa", isSystem: true },
  { id: "type_prompt", name: "Prompt", icon: "Sparkles", color: "#f59e0b", isSystem: true },
  { id: "type_note", name: "Note", icon: "FileText", color: "#34d399", isSystem: true },
  { id: "type_command", name: "Command", icon: "Terminal", color: "#a78bfa", isSystem: true },
  { id: "type_file", name: "File", icon: "File", color: "#94a3b8", isSystem: true },
  { id: "type_image", name: "Image", icon: "Image", color: "#f472b6", isSystem: true },
  { id: "type_url", name: "URL", icon: "Link", color: "#22d3ee", isSystem: true },
];

// ---------- Collections ----------

export const collections: Collection[] = [
  { id: "col_react", name: "React Patterns", description: "Reusable React hooks and components", isFavorite: false, itemCount: 18 },
  { id: "col_context", name: "Context Files", description: "AI context and project briefs", isFavorite: false, itemCount: 7 },
  { id: "col_python", name: "Python Snippets", description: "Backend and scripting helpers", isFavorite: false, itemCount: 24 },
  { id: "col_ai", name: "AI Prompts", description: "Reusable prompts and workflows", isFavorite: true, itemCount: 31 },
  { id: "col_shell", name: "Shell Toolkit", description: "Handy terminal commands", isFavorite: false, itemCount: 12 },
  { id: "col_api", name: "API References", description: "Useful docs and endpoints", isFavorite: false, itemCount: 9 },
  { id: "col_boiler", name: "Boilerplates", description: "Project starters and templates", isFavorite: false, itemCount: 5 },
];

// ---------- Items ----------

export const items: Item[] = [
  {
    id: "item_1",
    title: "useDebounce hook",
    description: "Debounce any fast-changing value with a configurable delay.",
    contentType: "TEXT",
    content:
      'import { useEffect, useState } from "react";\n\nexport function useDebounce<T>(value: T, delay = 300) {\n  const [debounced, setDebounced] = useState<T>(value);\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(id);\n  }, [value, delay]);\n  return debounced;\n}',
    fileName: null,
    fileSize: null,
    url: null,
    language: "tsx",
    isFavorite: true,
    isPinned: true,
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["react", "hooks", "performance"],
    createdAt: "2026-06-23T08:00:00Z",
    updatedAt: "2026-06-23T08:00:00Z",
  },
  {
    id: "item_2",
    title: "Senior code reviewer",
    description: "System prompt that turns the model into a thorough reviewer.",
    contentType: "TEXT",
    content:
      "You are a senior staff engineer performing a rigorous code review. Focus on correctness, edge cases, security, and readability. Reply with: 1) a summary, 2) blocking issues, 3) nits. Always suggest a concrete fix for every issue you raise.",
    fileName: null,
    fileSize: null,
    url: null,
    language: null,
    isFavorite: true,
    isPinned: true,
    typeId: "type_prompt",
    collectionId: "col_ai",
    tags: ["review", "system", "quality"],
    createdAt: "2026-06-23T05:00:00Z",
    updatedAt: "2026-06-23T05:00:00Z",
  },
  {
    id: "item_3",
    title: "Reset local git branch",
    description: "Hard reset the current branch to match origin.",
    contentType: "TEXT",
    content:
      "git fetch origin\ngit reset --hard origin/$(git branch --show-current)\ngit clean -fd",
    fileName: null,
    fileSize: null,
    url: null,
    language: "bash",
    isFavorite: true,
    isPinned: false,
    typeId: "type_command",
    collectionId: "col_shell",
    tags: ["git", "cli"],
    createdAt: "2026-06-22T10:00:00Z",
    updatedAt: "2026-06-22T10:00:00Z",
  },
  {
    id: "item_4",
    title: "FastAPI dependency injection",
    description: "Reusable DB session dependency for FastAPI routes.",
    contentType: "TEXT",
    content:
      "from fastapi import Depends\n\ndef get_db():\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()",
    fileName: null,
    fileSize: null,
    url: null,
    language: "python",
    isFavorite: false,
    isPinned: false,
    typeId: "type_snippet",
    collectionId: "col_python",
    tags: ["python", "fastapi", "backend"],
    createdAt: "2026-06-22T09:00:00Z",
    updatedAt: "2026-06-22T09:00:00Z",
  },
  {
    id: "item_5",
    title: "Project context — Billing service",
    description: "High-level architecture notes for the billing domain.",
    contentType: "TEXT",
    content:
      "# Billing Service\n\n- Stripe is the source of truth for subscriptions\n- Webhooks sync state into the 'subscriptions' table\n- Plan changes are idempotent and event-driven",
    fileName: null,
    fileSize: null,
    url: null,
    language: "markdown",
    isFavorite: false,
    isPinned: false,
    typeId: "type_note",
    collectionId: "col_context",
    tags: ["architecture", "billing", "docs"],
    createdAt: "2026-06-21T12:00:00Z",
    updatedAt: "2026-06-21T12:00:00Z",
  },
  {
    id: "item_6",
    title: "Tailwind config v4",
    description: "Baseline globals.css with design tokens.",
    contentType: "TEXT",
    content:
      '@import "tailwindcss";\n\n@theme inline {\n  --font-sans: var(--font-geist-sans);\n}',
    fileName: null,
    fileSize: null,
    url: null,
    language: "css",
    isFavorite: false,
    isPinned: false,
    typeId: "type_file",
    collectionId: "col_boiler",
    tags: ["tailwind", "css", "setup"],
    createdAt: "2026-06-20T12:00:00Z",
    updatedAt: "2026-06-20T12:00:00Z",
  },
  {
    id: "item_7",
    title: "Vercel AI SDK docs",
    description: "Streaming, tool calling and structured output reference.",
    contentType: "TEXT",
    content: null,
    fileName: null,
    fileSize: null,
    url: "https://sdk.vercel.ai/docs",
    language: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_url",
    collectionId: "col_api",
    tags: ["ai", "docs", "reference"],
    createdAt: "2026-06-20T09:00:00Z",
    updatedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "item_8",
    title: "Empty state illustration",
    description: "Reusable SVG illustration for empty dashboards.",
    contentType: "FILE",
    content: null,
    fileName: "empty-state.svg",
    fileSize: 24576,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_image",
    collectionId: null,
    tags: ["design", "assets"],
    createdAt: "2026-06-19T12:00:00Z",
    updatedAt: "2026-06-19T12:00:00Z",
  },
  {
    id: "item_9",
    title: "Optimistic UI with SWR",
    description: "Mutate cache optimistically and roll back on error.",
    contentType: "TEXT",
    content:
      "await mutate(\n  \"/api/todos\",\n  optimisticData,\n  { rollbackOnError: true, revalidate: false }\n);",
    fileName: null,
    fileSize: null,
    url: null,
    language: "tsx",
    isFavorite: false,
    isPinned: false,
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["react", "swr", "data"],
    createdAt: "2026-06-19T09:00:00Z",
    updatedAt: "2026-06-19T09:00:00Z",
  },
  {
    id: "item_10",
    title: "Generate commit message",
    description: "Prompt that writes conventional commits from a diff.",
    contentType: "TEXT",
    content:
      "Given the following git diff, write a single conventional commit message (type: subject). Keep the subject under 72 chars and add a short body only if it adds value.",
    fileName: null,
    fileSize: null,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_prompt",
    collectionId: "col_ai",
    tags: ["git", "prompt", "workflow"],
    createdAt: "2026-06-18T12:00:00Z",
    updatedAt: "2026-06-18T12:00:00Z",
  },
  {
    id: "item_11",
    title: "Find large files",
    description: "List the biggest files in the current directory tree.",
    contentType: "TEXT",
    content: "du -ah . | sort -rh | head -n 20",
    fileName: null,
    fileSize: null,
    url: null,
    language: "bash",
    isFavorite: false,
    isPinned: false,
    typeId: "type_command",
    collectionId: "col_shell",
    tags: ["cli", "disk"],
    createdAt: "2026-06-17T12:00:00Z",
    updatedAt: "2026-06-17T12:00:00Z",
  },
  {
    id: "item_12",
    title: "Prisma quickstart",
    description: "Official getting-started guide for Prisma ORM.",
    contentType: "TEXT",
    content: null,
    fileName: null,
    fileSize: null,
    url: "https://www.prisma.io/docs/getting-started",
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_url",
    collectionId: "col_api",
    tags: ["prisma", "database", "reference"],
    createdAt: "2026-06-16T12:00:00Z",
    updatedAt: "2026-06-16T12:00:00Z",
  },
];
