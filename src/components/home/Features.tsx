import {
  Code,
  File as FileIcon,
  Folder,
  Search,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Reveal } from "./Reveal";

const CODE_CHIP =
  "rounded-[0.3rem] border border-h-border bg-h-surface-3 px-[0.35em] py-[0.05em] font-mono text-[0.82em] text-h-text";

// Six built-in item types. Each card's accent (--c) comes from the canonical
// seed palette; the tint/border/hover all derive from it via color-mix.
const FEATURES: {
  Icon: LucideIcon;
  color: string;
  title: string;
  desc: ReactNode;
}[] = [
  {
    Icon: Code,
    color: "#3b82f6",
    title: "Code Snippets",
    desc: "Save reusable functions and hooks with syntax highlighting for every language you touch.",
  },
  {
    Icon: Sparkles,
    color: "#8b5cf6",
    title: "AI Prompts",
    desc: "Keep your best system prompts and workflows versioned instead of scrolling chat history.",
  },
  {
    Icon: Search,
    color: "#10b981",
    title: "Instant Search",
    desc: (
      <>
        Full-text search across content, titles, tags, and types. Hit{" "}
        <kbd className={CODE_CHIP}>⌘K</kbd> from anywhere.
      </>
    ),
  },
  {
    Icon: Terminal,
    color: "#f97316",
    title: "Commands",
    desc: (
      <>
        That one <code className={CODE_CHIP}>ffmpeg</code> incantation you always forget — one copy
        button away.
      </>
    ),
  },
  {
    Icon: FileIcon,
    color: "#ec4899",
    title: "Files & Docs",
    desc: "Upload templates, images, and context files. Everything stored alongside your code.",
  },
  {
    Icon: Folder,
    color: "#fde047",
    title: "Collections",
    desc: "Group mixed item types into collections like React Patterns or Shell Toolkit.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-6 py-22">
      <Reveal className="mb-12 max-w-[640px]">
        <h2 className="text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold leading-[1.1] tracking-[-0.03em]">
          Everything you save, in one place.
        </h2>
        <p className="mt-[0.9rem] text-[1.05rem] text-h-muted">
          Seven built-in item types, mixed collections, and full-text search across all of it. No
          more hunting through five apps.
        </p>
      </Reveal>

      <div className="grid grid-cols-3 gap-4 max-[940px]:grid-cols-2 max-[620px]:grid-cols-1">
        {FEATURES.map(({ Icon, color, title, desc }) => (
          <Reveal key={title} style={{ "--c": color } as CSSProperties}>
            <article className="h-full rounded-[1rem] border border-h-border bg-h-surface-1 p-[1.4rem] transition-[transform,border-color,background-color] duration-[180ms] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--c)_45%,var(--color-h-border))] hover:bg-[color-mix(in_srgb,var(--c)_5%,var(--color-h-surface-1))]">
              <span className="mb-4 grid size-11 place-items-center rounded-[0.6rem] border border-[color-mix(in_srgb,var(--c)_32%,transparent)] bg-[color-mix(in_srgb,var(--c)_15%,transparent)] text-[color:var(--c)]">
                <Icon className="size-[21px]" />
              </span>
              <h3 className="mb-[0.4rem] text-[1.1rem] tracking-[-0.01em]">{title}</h3>
              <p className="text-[0.92rem] leading-[1.55] text-h-muted">{desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
