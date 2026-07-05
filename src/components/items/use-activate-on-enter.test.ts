import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { useActivateOnEnter } from "./use-activate-on-enter";

// The hook is a pure factory: it returns a keyDown handler and calls no React
// hooks internally, so it can be exercised directly with a stub event.
function fakeEvent(key: string) {
  const preventDefault = vi.fn();
  return {
    event: { key, preventDefault } as unknown as KeyboardEvent<HTMLElement>,
    preventDefault,
  };
}

describe("useActivateOnEnter", () => {
  it("activates and prevents default on Enter", () => {
    const onActivate = vi.fn();
    const handler = useActivateOnEnter<HTMLElement>(onActivate);
    const { event, preventDefault } = fakeEvent("Enter");

    handler(event);

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("activates and prevents default on Space", () => {
    const onActivate = vi.fn();
    const handler = useActivateOnEnter<HTMLElement>(onActivate);
    const { event, preventDefault } = fakeEvent(" ");

    handler(event);

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys (no activation, no preventDefault)", () => {
    const onActivate = vi.fn();
    const handler = useActivateOnEnter<HTMLElement>(onActivate);

    for (const key of ["Tab", "a", "Escape", "ArrowDown", "Spacebar"]) {
      const { event, preventDefault } = fakeEvent(key);
      handler(event);
      expect(preventDefault).not.toHaveBeenCalled();
    }

    expect(onActivate).not.toHaveBeenCalled();
  });
});
