import { describe, expect, it } from "vitest";

import {
  acceptAttribute,
  UPLOAD_CONSTRAINTS,
  validateUpload,
} from "@/lib/validations/file";

const MB = 1024 * 1024;

describe("validateUpload — images", () => {
  it("accepts an allowed image (correct ext + MIME, within size)", () => {
    expect(validateUpload("image", "logo.png", "image/png", 1024)).toEqual({
      ok: true,
    });
  });

  it("accepts when the browser omits the MIME type (relies on extension)", () => {
    expect(validateUpload("image", "icon.svg", "", 500).ok).toBe(true);
  });

  it("rejects a disallowed extension", () => {
    const result = validateUpload("image", "photo.bmp", "image/bmp", 1024);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/\.png/);
  });

  it("rejects a concrete MIME type outside the allow-list", () => {
    const result = validateUpload("image", "logo.png", "application/zip", 1024);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not an allowed/i);
  });

  it("rejects an image larger than 5 MB", () => {
    const result = validateUpload("image", "big.png", "image/png", 5 * MB + 1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/5 MB/);
  });

  it("rejects an empty file", () => {
    expect(validateUpload("image", "logo.png", "image/png", 0).ok).toBe(false);
  });
});

describe("validateUpload — files", () => {
  it("accepts an allowed file type", () => {
    expect(validateUpload("file", "notes.md", "text/markdown", 1024).ok).toBe(
      true,
    );
  });

  it("accepts .ini / .toml with an empty or text MIME", () => {
    expect(validateUpload("file", "config.ini", "", 100).ok).toBe(true);
    expect(validateUpload("file", "data.toml", "text/plain", 100).ok).toBe(true);
  });

  it("rejects an extension that isn't allowed", () => {
    expect(validateUpload("file", "archive.zip", "application/zip", 10).ok).toBe(
      false,
    );
  });

  it("rejects a file larger than 10 MB", () => {
    const result = validateUpload("file", "big.pdf", "application/pdf", 10 * MB + 1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/10 MB/);
  });

  it("rejects a file with no extension", () => {
    expect(validateUpload("file", "Makefile", "text/plain", 100).ok).toBe(false);
  });
});

describe("acceptAttribute", () => {
  it("lists every extension and MIME type for the kind", () => {
    const accept = acceptAttribute("image");
    for (const ext of UPLOAD_CONSTRAINTS.image.extensions) {
      expect(accept).toContain(`.${ext}`);
    }
    for (const mime of UPLOAD_CONSTRAINTS.image.mimeTypes) {
      expect(accept).toContain(mime);
    }
  });
});
