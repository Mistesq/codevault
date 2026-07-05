"use client";

import { useState } from "react";

/**
 * Copy-to-clipboard state used by the various copy buttons: writes `text` to the
 * clipboard and flips `copied` true for `resetMs` (default 1500ms) so the button
 * can briefly swap its icon/label to a "Copied" confirmation. Clipboard rejects
 * (e.g. insecure context) are swallowed.
 */
export function useCopyToClipboard(text: string, resetMs = 1500) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    } catch {
      // Clipboard can reject (e.g. insecure context); silently ignore.
    }
  }

  return { copied, copy };
}
