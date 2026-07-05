import { requireSessionUser } from "@/lib/actions/session";
import { getItemDetail } from "@/lib/db/items";
import { getFromR2, keyFromPublicUrl } from "@/lib/r2";

// GET /api/items/[id]/download — stream a file/image item's R2 object back to
// the browser as an attachment. Proxying through the app (rather than linking
// the public R2 URL directly) keeps the download same-origin, avoids R2 CORS
// issues, and lets us force a download with the original filename. Requires a
// signed-in session; the item is scoped to the signed-in user (like the drawer).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const item = await getItemDetail(id);
  if (!item || item.contentType !== "FILE" || !item.fileUrl) {
    return new Response("Not found", { status: 404 });
  }

  const key = keyFromPublicUrl(item.fileUrl);
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getFromR2(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.contentType);
  if (object.contentLength != null) {
    headers.set("Content-Length", String(object.contentLength));
  }
  // Force a download with the original filename. Provide an ASCII-only
  // `filename` fallback plus an RFC 5987 `filename*` so non-ASCII names
  // (Cyrillic/CJK/emoji) survive instead of producing a malformed header.
  const rawName = item.fileName ?? "download";
  const asciiName = rawName.replace(/[^\x20-\x7e]/g, "_").replace(/["\r\n]/g, "");
  const encodedName = encodeURIComponent(rawName);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
  );

  return new Response(object.body, { status: 200, headers });
}
