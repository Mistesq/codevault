import { Code, FileText, Sparkles, Wand2, type LucideIcon } from "lucide-react";

import { Reveal } from "./Reveal";

const CAPS: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Wand2, title: "Auto-tagging", desc: "Relevant tags suggested the moment you paste." },
  { Icon: FileText, title: "AI summaries", desc: "A one-line gist for long notes and docs." },
  { Icon: Code, title: "Explain Code", desc: "Plain-English breakdowns of any snippet." },
  {
    Icon: Sparkles,
    title: "Prompt optimization",
    desc: "Tighter, more reliable prompts in one click.",
  },
];

const AI_TAGS = ["react", "hooks", "debounce", "typescript", "performance"];

// Syntax token colors for the editor mockup (kept literal — a fixed demo).
const KEY = "text-[#c084fc]";
const STR = "text-[#86efac]";
const FN = "text-[#7dd3fc]";
const NUM = "text-[#fca5a5]";

export function AiSection() {
  return (
    <section
      id="ai"
      className="mx-auto grid max-w-[1200px] grid-cols-[1fr_1.1fr] items-center gap-14 px-6 py-22 max-[940px]:grid-cols-1 max-[940px]:gap-10"
    >
      <Reveal>
        <span className="mb-3 inline-block text-[0.85rem] text-h-dim">AI, built in</span>
        <h2 className="text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold leading-[1.1] tracking-[-0.03em]">
          Let the model do the filing.
        </h2>
        <p className="mt-4 text-[1.05rem] leading-[1.6] text-h-muted">
          CodeVault reads what you save and does the tedious part — tagging, summarizing, and
          explaining — so your vault stays organized without the busywork.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-[0.9rem] max-[620px]:grid-cols-1">
          {CAPS.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-3 rounded-[0.625rem] border border-h-border bg-h-surface-1 p-4"
            >
              <span className="grid size-[34px] shrink-0 place-items-center rounded-[0.5rem] border border-h-border bg-h-surface-3 text-h-text">
                <Icon className="size-[17px]" />
              </span>
              <div>
                <p className="mb-[0.15rem] text-[0.95rem] font-semibold">{title}</p>
                <p className="text-[0.85rem] leading-[1.45] text-h-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="overflow-hidden rounded-[1rem] border border-h-border-strong bg-h-surface-2">
          <div className="flex items-center gap-3 border-b border-h-border bg-h-surface-3 px-4 py-[0.7rem]">
            <span className="inline-flex gap-[0.4rem]">
              <i className="size-[11px] rounded-full bg-[#ff5f57]" />
              <i className="size-[11px] rounded-full bg-[#febc2e]" />
              <i className="size-[11px] rounded-full bg-[#28c840]" />
            </span>
            <span className="font-mono text-[0.8rem] text-h-muted">useDebounce.ts</span>
            <span className="ml-auto text-[0.72rem] lowercase text-h-dim">typescript</span>
          </div>

          <pre className="overflow-x-auto whitespace-pre bg-h-code px-[1.2rem] py-[1.1rem] font-mono text-[0.82rem] leading-[1.7] text-h-text">
            <span className={KEY}>import</span>
            {' { useEffect, useState } '}
            <span className={KEY}>from</span> <span className={STR}>&quot;react&quot;</span>
            {"\n\n"}
            <span className={KEY}>export function</span> <span className={FN}>useDebounce</span>
            {"<T>(value: T, delay = "}
            <span className={NUM}>300</span>
            {") {\n"}
            {"  "}
            <span className={KEY}>const</span>
            {" [debounced, setDebounced] = "}
            <span className={FN}>useState</span>
            {"(value)\n"}
            {"  "}
            <span className={FN}>useEffect</span>
            {"(() => {\n"}
            {"    "}
            <span className={KEY}>const</span>
            {" id = "}
            <span className={FN}>setTimeout</span>
            {"(() => "}
            <span className={FN}>setDebounced</span>
            {"(value), delay)\n"}
            {"    "}
            <span className={KEY}>return</span>
            {" () => "}
            <span className={FN}>clearTimeout</span>
            {"(id)\n"}
            {"  }, [value, delay])\n"}
            {"  "}
            <span className={KEY}>return</span>
            {" debounced\n"}
            {"}"}
          </pre>

          <div className="border-t border-h-border px-[1.2rem] pt-[0.9rem] pb-[1.1rem]">
            <div className="mb-[0.7rem] flex items-center gap-[0.45rem] text-[0.8rem] text-h-muted">
              <Wand2 className="size-[15px] text-h-accent" /> AI generated tags
            </div>
            <div className="flex flex-wrap gap-[0.45rem]">
              {AI_TAGS.map((tag, i) => (
                <span
                  key={tag}
                  style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  className="animate-home-tag rounded-[0.35rem] border border-h-border bg-h-surface-3 px-[0.55rem] py-[0.2rem] font-mono text-[0.75rem] text-h-muted opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
