import { describe, expect, it } from "vitest";
import { cn, pluralize } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("supports conditional object syntax", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });

  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("pluralize", () => {
  it("uses the singular for a count of 1", () => {
    expect(pluralize(1, "item")).toBe("1 item");
    expect(pluralize(1, "collection")).toBe("1 collection");
  });

  it("appends an 's' for any other count", () => {
    expect(pluralize(0, "item")).toBe("0 items");
    expect(pluralize(3, "item")).toBe("3 items");
    expect(pluralize(2, "favorite")).toBe("2 favorites");
  });

  it("honors an explicit irregular plural", () => {
    expect(pluralize(2, "entry", "entries")).toBe("2 entries");
    expect(pluralize(1, "entry", "entries")).toBe("1 entry");
  });
});
