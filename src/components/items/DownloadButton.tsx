import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Download button that streams the file through the same-origin proxy route. */
export function DownloadButton({ itemId }: { itemId: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      // Rendering as an <a>, so opt out of native-button semantics.
      nativeButton={false}
      render={
        <a href={`/api/items/${itemId}/download`} download rel="noreferrer" />
      }
    >
      <Download className="size-4" />
      Download
    </Button>
  );
}
