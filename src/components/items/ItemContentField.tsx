import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";

/**
 * The item content editor used by both the create dialog and the drawer edit
 * form: code types (snippet/command) get the Monaco CodeEditor; notes & prompts
 * get the Markdown editor (Write/Preview).
 */
export function ItemContentField({
  isCode,
  value,
  onChange,
  language,
}: {
  isCode: boolean;
  value: string;
  onChange: (value: string) => void;
  language?: string;
}) {
  return isCode ? (
    <CodeEditor value={value} onChange={onChange} language={language} />
  ) : (
    <MarkdownEditor value={value} onChange={onChange} />
  );
}
