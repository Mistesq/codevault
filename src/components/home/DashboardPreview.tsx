import type { CSSProperties } from "react";
import { Clock, Pin, Search, Star, Vault } from "lucide-react";

import { TypeIcon } from "@/lib/type-icons";
import { ITEM_TYPE_COLORS } from "./item-type-colors";

// Faithful mini-replica of the real dashboard — the single surface where
// item-type colors are "correct" (sidebar type stripes/tints + card left
// borders). Static markup; per-type color flows through an inline `--c` var.
const QUICK_ROWS = [
  { icon: Search, label: "All Items", count: "12", active: true },
  { icon: Star, label: "Favorites", count: "4", tint: ITEM_TYPE_COLORS.note },
  { icon: Pin, label: "Pinned", count: "2", tint: ITEM_TYPE_COLORS.command },
  { icon: Clock, label: "Recent" },
];

const TYPE_ROWS = [
  { icon: "Code", label: "Snippet", color: ITEM_TYPE_COLORS.snippet, count: "32" },
  { icon: "Sparkles", label: "Prompt", color: ITEM_TYPE_COLORS.prompt, count: "31" },
  { icon: "Terminal", label: "Command", color: ITEM_TYPE_COLORS.command, count: "12" },
  { icon: "StickyNote", label: "Note", color: ITEM_TYPE_COLORS.note, count: "9" },
  { icon: "File", label: "File", color: ITEM_TYPE_COLORS.file, pro: true },
  { icon: "Image", label: "Image", color: ITEM_TYPE_COLORS.image, pro: true },
  { icon: "Link", label: "URL", color: ITEM_TYPE_COLORS.url, count: "7" },
];

const CARDS = [
  {
    icon: "Code",
    color: ITEM_TYPE_COLORS.snippet,
    title: "useDebounce hook",
    fav: true,
    code: "export function useDebounce<T>(\n  value: T, delay = 300)",
    tags: ["#react", "#hooks"],
    meta: "2h",
  },
  {
    icon: "Sparkles",
    color: ITEM_TYPE_COLORS.prompt,
    title: "Senior code reviewer",
    code: "You are a senior staff\nengineer performing a…",
    tags: ["#review", "#system"],
    meta: "5h",
  },
  {
    icon: "Terminal",
    color: ITEM_TYPE_COLORS.command,
    title: "Reset local git branch",
    code: "git reset --hard \\\n  origin/$(git branch…)",
    tags: ["#git", "#cli"],
    meta: "1d",
  },
  {
    icon: "Link",
    color: ITEM_TYPE_COLORS.url,
    title: "Vercel AI SDK docs",
    fav: true,
    code: "https://sdk.vercel.ai/docs",
    tags: ["#ai", "#docs"],
    meta: "3d",
  },
];

export function DashboardPreview() {
  return (
    <div className="grid grid-cols-[148px_1fr] overflow-hidden rounded-[0.625rem] border border-h-border bg-h-bg text-[11px] max-[620px]:grid-cols-1">
      {/* mini sidebar */}
      <aside className="border-r border-h-border bg-h-surface-1 px-2 py-[0.7rem] max-[620px]:hidden">
        <div className="flex items-center gap-[0.4rem] px-1 pb-[0.6rem] text-[12px] font-bold tracking-[-0.02em]">
          <span className="grid size-[22px] place-items-center rounded-[0.4rem] bg-h-brand text-white">
            <Vault className="size-[12px]" />
          </span>
          <span>CodeVault</span>
        </div>

        <div className="grid gap-px">
          {QUICK_ROWS.map((row) => (
            <div
              key={row.label}
              className={`flex items-center gap-[0.45rem] rounded-[0.35rem] px-[0.35rem] py-[0.3rem] ${
                row.active ? "bg-h-surface-3 text-h-text" : "text-h-muted"
              }`}
            >
              <row.icon className="size-[13px]" style={row.tint ? { color: row.tint } : undefined} />
              <span className="flex-1 truncate">{row.label}</span>
              {row.count && <span className="text-[10px] text-h-dim">{row.count}</span>}
            </div>
          ))}
        </div>

        <div className="px-[0.35rem] pt-2 pb-[0.3rem] text-[9px] uppercase tracking-[0.08em] text-h-dim">
          Types
        </div>
        <div className="grid gap-px">
          {TYPE_ROWS.map((row) => (
            <div
              key={row.label}
              style={{ "--c": row.color } as CSSProperties}
              className="flex items-center gap-[0.45rem] rounded-[0.35rem] px-[0.35rem] py-[0.3rem] text-h-muted"
            >
              <TypeIcon name={row.icon} className="size-[13px] text-[color:var(--c)]" />
              <span className="flex-1 truncate">{row.label}</span>
              {row.pro ? (
                <span className="rounded-[4px] border border-h-accent-soft bg-h-accent-soft px-1 py-px text-[8px] font-bold tracking-[0.05em] text-h-accent">
                  PRO
                </span>
              ) : (
                <span className="text-[10px] text-h-dim">{row.count}</span>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* mini main */}
      <div className="min-w-0 p-[0.7rem]">
        <div className="mb-[0.7rem] flex items-center gap-[0.4rem] rounded-[0.4rem] border border-h-border bg-h-surface-1 px-[0.55rem] py-[0.4rem] text-h-dim">
          <Search className="size-[13px]" />
          <span className="flex-1 truncate">Search snippets, prompts, commands…</span>
          <kbd className="rounded-[3px] border border-h-border px-1 py-px font-mono text-[9px] text-h-dim">
            ⌘K
          </kbd>
        </div>

        <div className="grid grid-cols-2 gap-[0.5rem] max-[620px]:grid-cols-1">
          {CARDS.map((card) => (
            <article
              key={card.title}
              style={{ "--c": card.color } as CSSProperties}
              className="overflow-hidden rounded-[0.45rem] border border-h-border border-l-2 border-l-[color:var(--c)] bg-h-surface-2 px-[0.55rem] py-[0.5rem]"
            >
              <div className="mb-[0.4rem] flex items-center gap-[0.35rem]">
                <span className="grid size-5 place-items-center rounded-[0.35rem] bg-[color-mix(in_srgb,var(--c)_15%,transparent)] text-[color:var(--c)]">
                  <TypeIcon name={card.icon} className="size-[12px]" />
                </span>
                <p className="flex-1 truncate text-[11px] font-semibold">{card.title}</p>
                {card.fav && (
                  <Star
                    className="size-[12px]"
                    style={{ color: ITEM_TYPE_COLORS.note, fill: ITEM_TYPE_COLORS.note }}
                  />
                )}
              </div>
              <pre className="mb-[0.4rem] overflow-hidden whitespace-pre rounded-[0.3rem] border border-h-border bg-h-code px-[0.45rem] py-[0.35rem] font-mono text-[9.5px] leading-[1.45] text-h-muted">
                {card.code}
              </pre>
              <div className="flex items-center gap-[0.3rem] text-[9px] text-h-accent">
                {card.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
                <span className="ml-auto text-h-dim">{card.meta}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
