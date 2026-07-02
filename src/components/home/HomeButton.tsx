import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Marketing CTA button. Wraps the shadcn Button so it keeps the focus ring /
// active-press behaviour, but overrides the theme's white primary with the
// homepage's blue accent and the larger marketing sizing. Internal routes render
// as next/link; on-page anchors (#features) render as a plain <a>.
type HomeButtonVariant = "primary" | "outline" | "ghost";
type HomeButtonSize = "md" | "lg";

const VARIANTS: Record<HomeButtonVariant, string> = {
  primary: "bg-h-accent text-white hover:bg-h-accent-hover",
  outline:
    "border-h-border-strong bg-transparent text-h-text hover:border-h-dim hover:bg-h-surface-2",
  ghost: "bg-transparent text-h-muted hover:bg-h-surface-2 hover:text-h-text",
};

const SIZES: Record<HomeButtonSize, string> = {
  md: "px-4 py-[0.55rem] text-[0.9rem]",
  lg: "px-[1.4rem] py-3 text-[0.98rem]",
};

export function HomeButton({
  href,
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
}: {
  href: string;
  variant?: HomeButtonVariant;
  size?: HomeButtonSize;
  block?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const isAnchor = href.startsWith("#");
  return (
    <Button
      nativeButton={false}
      render={isAnchor ? <a href={href} /> : <Link href={href} />}
      className={cn(
        "h-auto rounded-[0.625rem] font-semibold",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
    >
      {children}
    </Button>
  );
}
