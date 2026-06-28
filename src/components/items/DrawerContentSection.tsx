import { CodeEditor } from "@/components/items/CodeEditor";
import { CopyButton } from "@/components/items/CopyButton";
import { ItemContentBody } from "@/components/items/ItemContentBody";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { SectionLabel } from "@/components/items/SectionLabel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CODE_CONTENT_TYPES,
  MARKDOWN_CONTENT_TYPES,
} from "@/lib/item-content-types";
import type { ItemDetail } from "@/lib/db/items";

/**
 * The drawer's CONTENT section. Code types and notes/prompts display their
 * content in an editor whose own header carries the copy button — so the
 * section-level copy is hidden in those cases to avoid two copy controls.
 * Skeleton while loading, an error note on failure, otherwise the editor or the
 * plain content body.
 */
export function DrawerContentSection({
  detail,
  loading,
  error,
  copyText,
}: {
  detail: ItemDetail | null;
  loading: boolean;
  error: boolean;
  copyText: string;
}) {
  const typeName = detail?.type.name.toLowerCase();
  const showCodeEditor =
    !!detail && CODE_CONTENT_TYPES.has(typeName!) && !!detail.content;
  const showMarkdown =
    !!detail && MARKDOWN_CONTENT_TYPES.has(typeName!) && !!detail.content;
  const showEditorHeader = showCodeEditor || showMarkdown;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionLabel>Content</SectionLabel>
        {detail && !showEditorHeader && (
          <CopyButton text={copyText} size="sm" withLabel />
        )}
      </div>
      {loading && !detail ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm text-destructive">
            Couldn&apos;t load this item. Please try again.
          </p>
        </div>
      ) : showCodeEditor && detail ? (
        <CodeEditor
          value={detail.content ?? ""}
          language={detail.language}
          readOnly
        />
      ) : showMarkdown && detail ? (
        <MarkdownEditor value={detail.content ?? ""} readOnly />
      ) : detail ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <ItemContentBody detail={detail} />
        </div>
      ) : null}
    </section>
  );
}
