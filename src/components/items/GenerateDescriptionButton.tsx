"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateDescription } from "@/actions/ai";

/**
 * AI "Generate" affordance for the create/edit item forms. Renders a small ghost
 * button next to the Description label that asks Gemini for a concise 1-2 sentence
 * description from whatever the user has entered so far (title, content, type,
 * url, language) — no save required. On success it hands the text back via
 * `onGenerate`, which replaces the current description; the user can then edit it.
 *
 * Pro-only: the parent hides this entirely for Free users; the server action
 * re-checks Pro as the real enforcement. Disabled until there's a usable signal
 * (a title, some content, or a url) since those are the only standalone signals.
 */
export function GenerateDescriptionButton({
  title,
  content,
  type,
  url,
  language,
  onGenerate,
}: {
  title: string;
  content: string;
  type: string;
  url: string;
  language: string;
  onGenerate: (description: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const hasSignal =
    title.trim().length > 0 ||
    content.trim().length > 0 ||
    url.trim().length > 0;
  const canGenerate = hasSignal && !loading;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);

    const result = await generateDescription({
      title,
      content,
      type,
      url,
      language,
    });

    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onGenerate(result.data);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={!canGenerate}
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
      title={
        hasSignal
          ? "Generate a description with AI"
          : "Add a title or some content first"
      }
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Wand2 className="size-3.5" />
      )}
      {loading ? "Generating…" : "Generate"}
    </Button>
  );
}
