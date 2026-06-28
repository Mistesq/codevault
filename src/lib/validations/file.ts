// Upload constraints for the File & Image item types, shared by the client
// FileUpload component and the server upload route (the server is the source of
// truth — the client checks are just for fast feedback). No `server-only` here.

export type UploadKind = "image" | "file";

interface UploadConstraints {
  /** Human label for messages. */
  label: string;
  /** Max size in bytes. */
  maxSize: number;
  /** Allowed lowercase extensions (without the dot). */
  extensions: string[];
  /** Allowed MIME types. */
  mimeTypes: string[];
}

const MB = 1024 * 1024;

export const UPLOAD_CONSTRAINTS: Record<UploadKind, UploadConstraints> = {
  image: {
    label: "Image",
    maxSize: 5 * MB,
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
  },
  file: {
    label: "File",
    maxSize: 10 * MB,
    extensions: ["pdf", "txt", "md", "json", "yaml", "yml", "xml", "csv", "toml", "ini"],
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/toml",
    ],
  },
};

/** The `accept` attribute value for a file input of the given kind. */
export function acceptAttribute(kind: UploadKind): string {
  const { extensions, mimeTypes } = UPLOAD_CONSTRAINTS[kind];
  return [...extensions.map((e) => `.${e}`), ...mimeTypes].join(",");
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / MB)} MB`;
}

export interface UploadValidation {
  ok: boolean;
  error?: string;
}

/**
 * Validate an upload's name/MIME/size against the kind's constraints. The
 * extension is the primary gate (browsers report inconsistent MIME types,
 * e.g. `.md`/`.toml`/`.ini` often arrive as empty or `text/plain`); the MIME
 * type is accepted when present-and-allowed or empty, but rejected when it's a
 * concrete type outside the allow-list.
 */
export function validateUpload(
  kind: UploadKind,
  fileName: string,
  mimeType: string,
  size: number,
): UploadValidation {
  const constraints = UPLOAD_CONSTRAINTS[kind];

  const ext = extensionOf(fileName);
  if (!ext || !constraints.extensions.includes(ext)) {
    return {
      ok: false,
      error: `${constraints.label} must be one of: ${constraints.extensions
        .map((e) => `.${e}`)
        .join(", ")}.`,
    };
  }

  if (mimeType && !constraints.mimeTypes.includes(mimeType)) {
    return {
      ok: false,
      error: `${mimeType} is not an allowed ${constraints.label.toLowerCase()} type.`,
    };
  }

  if (size <= 0) {
    return { ok: false, error: "File is empty." };
  }

  if (size > constraints.maxSize) {
    return {
      ok: false,
      error: `${constraints.label} must be ${formatMb(constraints.maxSize)} or smaller.`,
    };
  }

  return { ok: true };
}
