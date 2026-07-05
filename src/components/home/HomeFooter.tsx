import { Vault } from "lucide-react";

const FOOTER_COLS = [
  {
    heading: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#ai", label: "AI" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    // Resources/Company have no destinations yet — inert placeholders.
    heading: "Resources",
    links: [
      { href: "#", label: "Documentation" },
      { href: "#", label: "Changelog" },
      { href: "#", label: "Roadmap" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "#", label: "About" },
      { href: "#", label: "Privacy" },
      { href: "#", label: "Terms" },
    ],
  },
];

export function HomeFooter({ year }: { year: number }) {
  return (
    <footer className="mt-12 border-t border-h-border">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[1.4fr_2fr] gap-10 px-6 pt-14 pb-10 max-[940px]:grid-cols-1 max-[940px]:gap-8">
        <div>
          <a href="#top" className="inline-flex items-center gap-[0.6rem]">
            <span className="grid size-8 place-items-center rounded-lg bg-h-brand text-white">
              <Vault className="size-4" />
            </span>
            <span className="flex flex-col leading-[1.15]">
              <span className="text-[0.98rem] font-semibold tracking-[-0.01em]">CodeVault</span>
              <span className="text-[0.72rem] text-h-muted">Knowledge Hub</span>
            </span>
          </a>
          <p className="mt-[0.8rem] text-[0.9rem] text-h-dim">Store smarter. Build faster.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-[0.9rem] text-[0.8rem] uppercase tracking-[0.06em] text-h-dim">
                {col.heading}
              </h3>
              {col.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-1 text-[0.9rem] text-h-muted transition-colors hover:text-h-text"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] items-center justify-between border-t border-h-border px-6 py-[1.4rem] text-[0.82rem] text-h-dim max-[620px]:flex-col max-[620px]:gap-2 max-[620px]:text-center">
        <span>&copy; {year} CodeVault. All rights reserved.</span>
        <span className="font-mono">Store Smarter. Build Faster.</span>
      </div>
    </footer>
  );
}
