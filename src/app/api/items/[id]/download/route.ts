import { auth } from "@/auth";
import { getItemDetail } from "@/lib/db/items";
import { getFromR2, keyFromPublicUrl } from "@/lib/r2";

// GET /api/items/[id]/download — stream a file/image item's R2 object back to
// the browser as an attachment. Proxying through the app (rather than linking
// the public R2 URL directly) keeps the download same-origin, avoids R2 CORS
// issues, and lets us force a download with the original filename. Requires a
// signed-in session; the item is demo-user scoped (like the drawer).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
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
  // Force a download with the original filename (sanitized for the header).
  const safeName = (item.fileName ?? "download").replace(/["\r\n]/g, "");
  headers.set("Content-Disposition", `attachment; filename="${safeName}"`);

  return new Response(object.body, { status: 200, headers });
}
