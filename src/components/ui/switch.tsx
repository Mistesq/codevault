"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

/**
 * A small dark-themed toggle built on Base UI's Switch. Controlled via
 * `checked` / `onCheckedChange` (mirrors the underlying primitive). Off: white
 * thumb on a subtle track. On: the track turns primary and the thumb flips to a
 * dark cutout so it stays visible against the light track.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <BaseSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        "bg-input data-checked:bg-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <BaseSwitch.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-4.5 data-checked:bg-background" />
    </BaseSwitch.Root>
  );
}
