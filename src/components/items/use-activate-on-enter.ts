import type { KeyboardEvent } from "react";

/**
 * Returns an `onKeyDown` handler that fires `onActivate` on Enter or Space
 * (preventing the default scroll/submit), giving a non-button element that acts
 * as a button (`role="button"` cards/rows) proper keyboard activation.
 */
export function useActivateOnEnter<T extends HTMLElement>(
  onActivate: () => void,
) {
  return (e: KeyboardEvent<T>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };
}
