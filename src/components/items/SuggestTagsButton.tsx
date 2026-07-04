"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateAutoTags } from "@/actions/ai";

/**
 * AI "Suggest Tags" affordance for the create/edit item forms. Renders a ghost
 * button that asks Gemini for 3-5 freeform tags based on the item's title +
 * content, then shows each suggestion as a badge with accept (✓) / reject (✕)
 * controls. Accepting calls `onAdd`; the parent owns the tag list, so an
 * accepted (or otherwise already-present) tag drops out of the suggestion row.
 *
 * Pro-only: the parent hides this entirely for Free users; the server action
 * re-checks Pro as the real enforcement.
 */
export function SuggestTagsButton({
  title,
  content,
  currentTags,
  onAdd,
}: {
  title: string;
  content: string;
  currentTags: string[];
  onAdd: (tag: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const canSuggest = title.trim().length > 0 && !loading;
  // Hide any suggestion the user has already added (or accepted) from the list.
  const visible = suggestions.filter((tag) => !currentTags.includes(tag));

  async function handleSuggest() {
    if (!canSuggest) return;
    setLoading(true);

    const result = await generateAutoTags({ title, content });

    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSuggestions(result.data);
  }

  function dismiss(tag: string) {
    setSuggestions((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSuggest}
        disabled={!canSuggest}
        title={
          title.trim().length === 0
            ? "Add a title first to suggest tags"
            : "Suggest tags with AI"
        }
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        {loading ? "Suggesting…" : "Suggest Tags"}
      </Button>

      {visible.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 py-0.5 pl-2 pr-1 text-xs text-foreground"
            >
              <span className="truncate">#{tag}</span>
              <button
                type="button"
                onClick={() => {
                  onAdd(tag);
                  dismiss(tag);
                }}
                aria-label={`Add tag ${tag}`}
                title={`Add tag ${tag}`}
                className="flex size-4 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <Check className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => dismiss(tag)}
                aria-label={`Dismiss tag ${tag}`}
                title={`Dismiss tag ${tag}`}
                className="flex size-4 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
