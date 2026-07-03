import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, isR2Configured, uploadToR2 } from "@/lib/r2";
import { UPLOAD_CONSTRAINTS, validateUpload } from "@/lib/validations/file";
import type { UploadKind } from "@/lib/validations/file";

// POST /api/upload — store a file/image in R2 and return its public metadata.
// The item itself is created afterward via the createItem action (this route
// only handles the upload so it can stream multipart with progress). Requires a
// signed-in session. The object is namespaced under the signed-in user.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "File storage is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const kindRaw = formData.get("kind");
  const kind = kindRaw === "image" ? "image" : kindRaw === "file" ? "file" : null;
  if (!kind) {
    return NextResponse.json({ error: "Invalid upload kind." }, { status: 400 });
  }

  // File uploads are a Pro feature; image uploads stay free (per spec). The
  // createItem FILE branch enforces the same rule as a second layer.
  if (kind === "file") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPro: true },
    });
    if (!user?.isPro) {
      return NextResponse.json(
        { error: "File uploads are a Pro feature." },
        { status: 402 },
      );
    }
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const validation = validateUpload(
    kind as UploadKind,
    file.name,
    file.type,
    file.size,
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Namespace the object under the signed-in user (the key only needs to be
  // stable + unique).
  const userId = session.user.id ?? "anonymous";

  try {
    const key = buildObjectKey(userId, kind, file.name);
    // R2 needs a concrete buffer; these are small (≤10 MB, enforced above).
    const buffer = Buffer.from(await file.arrayBuffer());
    // Trust the validated extension's canonical MIME when the browser sent none.
    const contentType =
      file.type || UPLOAD_CONSTRAINTS[kind].mimeTypes[0] || "application/octet-stream";

    const fileUrl = await uploadToR2(key, buffer, contentType);

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
