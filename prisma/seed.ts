import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to your .env file.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@codevault.io";

const SYSTEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6" },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", icon: "Terminal", color: "#f97316" },
  { name: "note", icon: "StickyNote", color: "#fde047" },
  { name: "file", icon: "File", color: "#6b7280" },
  { name: "image", icon: "Image", color: "#ec4899" },
  { name: "URL", icon: "Link", color: "#10b981" },
];

async function main() {
  // Idempotent: remove prior demo data so the script can be re-run safely.
  // Deleting the user cascades their items/collections/tags; system types
  // (userId null) are removed separately once no items reference them.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  await prisma.itemType.deleteMany({ where: { isSystem: true } });

  const password = await bcrypt.hash("12345678", 12);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      password,
      isPro: false,
      emailVerified: new Date(),
    },
  });

  // System item types (shared across all users).
  const typeId: Record<string, string> = {};
  for (const t of SYSTEM_TYPES) {
    const created = await prisma.itemType.create({
      data: { ...t, isSystem: true },
    });
    typeId[t.name] = created.id;
  }

  type SeedItem = {
    title: string;
    typeName: string;
    content?: string;
    language?: string;
    url?: string;
    description?: string;
    isPinned?: boolean;
    isFavorite?: boolean;
  };

  async function seedCollection(
    name: string,
    description: string,
    items: SeedItem[],
  ) {
    const collection = await prisma.collection.create({
      data: { name, description, userId: user.id },
    });
    // Items belong to collections via the ItemCollection join table; create each
    // item then link it to this collection (matching the many-to-many schema).
    for (const it of items) {
      const item = await prisma.item.create({
        data: {
          title: it.title,
          content: it.content ?? null,
          language: it.language ?? null,
          url: it.url ?? null,
          description: it.description ?? null,
          isPinned: it.isPinned ?? false,
          isFavorite: it.isFavorite ?? false,
          typeId: typeId[it.typeName],
          userId: user.id,
        },
        select: { id: true },
      });
      await prisma.itemCollection.create({
        data: { itemId: item.id, collectionId: collection.id },
      });
    }
  }

  await seedCollection("React Patterns", "Reusable React patterns and hooks", [
    {
      title: "useDebounce hook",
      typeName: "snippet",
      language: "ts",
      description: "Debounce a rapidly changing value.",
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
      description: "Compound-component style context with a typed hook.",
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
      title: "cn() className utility",
      typeName: "snippet",
      language: "ts",
      description: "Merge Tailwind classes without conflicts.",
      content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
    },
  ]);

  await seedCollection("AI Workflows", "AI prompts and workflow automations", [
    {
      title: "Code review prompt",
      typeName: "prompt",
      description: "Structured, severity-ranked code review.",
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
      description: "Generate docs from a code block.",
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
      description: "Behavior-preserving refactor with rationale.",
      content: `Refactor the following code to improve readability and maintainability
WITHOUT changing its behavior. Prefer small, well-named functions and remove
duplication. List each change as a bullet with a one-line rationale.

\`\`\`
{{code}}
\`\`\``,
    },
  ]);

  await seedCollection(
    "DevOps",
    "Infrastructure and deployment resources",
    [
      {
        title: "Multi-stage Next.js Dockerfile",
        typeName: "snippet",
        language: "dockerfile",
        description: "Lean production image via multi-stage build.",
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
        description: "Prebuilt production deploy.",
        content: `npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod`,
      },
      {
        title: "Docker documentation",
        typeName: "URL",
        url: "https://docs.docker.com/",
        description: "Official Docker docs.",
      },
      {
        title: "GitHub Actions documentation",
        typeName: "URL",
        url: "https://docs.github.com/en/actions",
        description: "CI/CD with GitHub Actions.",
      },
    ],
  );

  await seedCollection(
    "Terminal Commands",
    "Useful shell commands for everyday development",
    [
      {
        title: "Undo last commit (keep changes)",
        typeName: "command",
        language: "bash",
        description: "Soft reset to the previous commit.",
        content: "git reset --soft HEAD~1",
      },
      {
        title: "Prune unused Docker resources",
        typeName: "command",
        language: "bash",
        description: "Remove dangling images, containers, and volumes.",
        content: "docker system prune -af --volumes",
      },
      {
        title: "Kill the process on a port",
        typeName: "command",
        language: "bash",
        description: "Free up a port that is already in use.",
        content: "lsof -ti:3000 | xargs kill -9",
      },
      {
        title: "Clean reinstall of dependencies",
        typeName: "command",
        language: "bash",
        description: "Nuke node_modules and the lockfile, then reinstall.",
        content: "rm -rf node_modules package-lock.json && npm install",
      },
    ],
  );

  await seedCollection("Design Resources", "UI/UX resources and references", [
    {
      title: "Tailwind CSS documentation",
      typeName: "URL",
      url: "https://tailwindcss.com/docs",
      description: "Utility-first CSS reference.",
    },
    {
      title: "shadcn/ui",
      typeName: "URL",
      url: "https://ui.shadcn.com",
      description: "Composable React component library.",
    },
    {
      title: "Radix UI",
      typeName: "URL",
      url: "https://www.radix-ui.com",
      description: "Unstyled, accessible primitives & design system.",
    },
    {
      title: "Lucide icons",
      typeName: "URL",
      url: "https://lucide.dev/icons",
      description: "Open-source icon set used across the app.",
    },
  ]);

  const [collections, items, types] = await Promise.all([
    prisma.collection.count({ where: { userId: user.id } }),
    prisma.item.count({ where: { userId: user.id } }),
    prisma.itemType.count({ where: { isSystem: true } }),
  ]);

  console.log("✅ Seed complete");
  console.log(`   User:        ${user.email}`);
  console.log(`   Item types:  ${types}`);
  console.log(`   Collections: ${collections}`);
  console.log(`   Items:       ${items}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
