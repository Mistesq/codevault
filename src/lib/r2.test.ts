import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Pure key/URL helpers from the R2 lib. The S3 client is built lazily, so
// importing this module without credentials is safe; we only exercise the
// helpers that depend on R2_PUBLIC_URL.
import { buildObjectKey, keyFromPublicUrl, publicUrlForKey } from "@/lib/r2";

const PUBLIC = "https://pub-test.r2.dev";

beforeAll(() => {
  process.env.R2_PUBLIC_URL = PUBLIC;
});
afterAll(() => {
  delete process.env.R2_PUBLIC_URL;
});

describe("publicUrlForKey", () => {
  it("joins the public base and the key", () => {
    expect(publicUrlForKey("uploads/u/file/a.pdf")).toBe(
      `${PUBLIC}/uploads/u/file/a.pdf`,
    );
  });
});

describe("keyFromPublicUrl", () => {
  it("round-trips a key built by publicUrlForKey", () => {
    const key = "uploads/u/image/a.png";
    expect(keyFromPublicUrl(publicUrlForKey(key))).toBe(key);
  });

  it("returns null for a URL outside our public bucket", () => {
    expect(keyFromPublicUrl("https://evil.example.com/uploads/x")).toBeNull();
  });

  it("returns null when there is no key after the base", () => {
    expect(keyFromPublicUrl(`${PUBLIC}/`)).toBeNull();
  });
});

describe("buildObjectKey", () => {
  it("namespaces by user + kind and keeps the lowercased extension", () => {
    const key = buildObjectKey("user_1", "image", "Logo.PNG");
    expect(key).toMatch(/^uploads\/user_1\/image\/[0-9a-f-]+\.png$/);
  });

  it("handles a file with no extension", () => {
    const key = buildObjectKey("user_1", "file", "Makefile");
    expect(key).toMatch(/^uploads\/user_1\/file\/[0-9a-f-]+$/);
  });

  it("produces unique keys for the same filename", () => {
    const a = buildObjectKey("user_1", "file", "a.pdf");
    const b = buildObjectKey("user_1", "file", "a.pdf");
    expect(a).not.toBe(b);
  });
});
