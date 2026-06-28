import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Cloudflare R2 client + helpers. R2 speaks the S3 API, so we use the AWS S3
// SDK pointed at the account's R2 endpoint. Kept server-only so the access keys
// never reach a client bundle.

let client: S3Client | null = null;

/** Whether the R2 env is configured enough to upload/download. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL,
  );
}

/** Lazily build the S3 client for R2; throws if the env is missing. */
function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured — missing account/credentials.");
  }

  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function bucket(): string {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME is not set.");
  return name;
}

function publicBase(): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) throw new Error("R2_PUBLIC_URL is not set.");
  return base.replace(/\/+$/, "");
}

/** Public URL for a stored object key. */
export function publicUrlForKey(key: string): string {
  return `${publicBase()}/${key}`;
}

/**
 * Derive the object key from a previously-stored public URL. Returns null when
 * the URL doesn't belong to our public bucket (so we never try to delete/serve
 * an unrelated object).
 */
export function keyFromPublicUrl(url: string): string | null {
  const prefix = `${publicBase()}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key.length > 0 ? key : null;
}

/**
 * Build a collision-resistant object key for an upload, namespaced by user and
 * kind. Keeps the original extension so the public URL stays meaningful.
 */
export function buildObjectKey(
  userId: string,
  kind: "image" | "file",
  fileName: string,
): string {
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
  const suffix = ext ? `.${ext}` : "";
  return `uploads/${userId}/${kind}/${randomUUID()}${suffix}`;
}

/** Upload a buffer to R2 under the given key; returns the public URL. */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrlForKey(key);
}

/** Delete an object from R2. Swallows errors so item deletion never fails on a
 *  missing/unreachable object — the DB row is the source of truth. */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
    );
  } catch (error) {
    console.error("Failed to delete R2 object:", key, error);
  }
}

export interface R2Object {
  body: ReadableStream;
  contentType: string;
  contentLength: number | undefined;
}

/** Fetch an object from R2 for the download proxy. Returns null when missing. */
export async function getFromR2(key: string): Promise<R2Object | null> {
  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
    if (!res.Body) return null;
    return {
      // In the Node/Next runtime the SDK Body is a web ReadableStream.
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType ?? "application/octet-stream",
      contentLength: res.ContentLength,
    };
  } catch (error) {
    console.error("Failed to read R2 object:", key, error);
    return null;
  }
}
