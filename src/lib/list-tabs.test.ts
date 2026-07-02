import { describe, expect, it } from "vitest";

import { parseListTab } from "@/lib/list-tabs";

describe("parseListTab", () => {
  it("accepts the two known tabs", () => {
    expect(parseListTab("items")).toBe("items");
    expect(parseListTab("collections")).toBe("collections");
  });

  it("falls back to items by default for missing / unknown values", () => {
    expect(parseListTab(undefined)).toBe("items");
    expect(parseListTab("")).toBe("items");
    expect(parseListTab("bogus")).toBe("items");
  });

  it("honors a custom fallback", () => {
    expect(parseListTab(undefined, "collections")).toBe("collections");
    expect(parseListTab("nope", "collections")).toBe("collections");
  });

  it("uses the first entry of a repeated param", () => {
    expect(parseListTab(["collections", "items"])).toBe("collections");
  });
});
