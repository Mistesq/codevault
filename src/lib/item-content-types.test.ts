import { describe, expect, it } from "vitest";

import { isFileType, isImageType } from "@/lib/item-content-types";

describe("isImageType", () => {
  it("matches the image type regardless of case", () => {
    expect(isImageType("image")).toBe(true);
    expect(isImageType("Image")).toBe(true);
  });

  it("rejects other types", () => {
    expect(isImageType("file")).toBe(false);
    expect(isImageType("snippet")).toBe(false);
    expect(isImageType("")).toBe(false);
  });
});

describe("isFileType", () => {
  it("matches the file type regardless of case", () => {
    expect(isFileType("file")).toBe(true);
    expect(isFileType("File")).toBe(true);
  });

  it("rejects other types", () => {
    expect(isFileType("image")).toBe(false);
    expect(isFileType("note")).toBe(false);
    expect(isFileType("")).toBe(false);
  });
});
