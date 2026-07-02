import { describe, expect, it } from "vitest";

import {
  clampPage,
  getPageRange,
  pageOffset,
  paginateArray,
  parsePageParam,
  totalPagesFor,
} from "@/lib/pagination";

describe("parsePageParam", () => {
  it("parses a positive integer string", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("falls back to 1 for missing / invalid / non-positive values", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("1.5")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });

  it("uses the first entry of a repeated param", () => {
    expect(parsePageParam(["4", "9"])).toBe(4);
  });
});

describe("totalPagesFor", () => {
  it("is at least 1 even with zero rows", () => {
    expect(totalPagesFor(0, 21)).toBe(1);
  });

  it("rounds up partial pages", () => {
    expect(totalPagesFor(21, 21)).toBe(1);
    expect(totalPagesFor(22, 21)).toBe(2);
    expect(totalPagesFor(42, 21)).toBe(2);
    expect(totalPagesFor(43, 21)).toBe(3);
  });
});

describe("clampPage", () => {
  it("clamps below 1 and above totalPages", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-3, 5)).toBe(1);
    expect(clampPage(99, 5)).toBe(5);
  });

  it("leaves an in-range page untouched", () => {
    expect(clampPage(3, 5)).toBe(3);
  });
});

describe("pageOffset", () => {
  it("computes the zero-based skip", () => {
    expect(pageOffset(1, 21)).toBe(0);
    expect(pageOffset(2, 21)).toBe(21);
    expect(pageOffset(3, 21)).toBe(42);
  });
});

describe("paginateArray", () => {
  const rows = Array.from({ length: 25 }, (_, i) => i + 1);

  it("returns the first page slice and metadata", () => {
    const result = paginateArray(rows, 1, 10);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toMatchObject({ page: 1, totalPages: 3, totalCount: 25 });
  });

  it("returns a middle page slice", () => {
    expect(paginateArray(rows, 2, 10).items).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it("returns the partial final page", () => {
    expect(paginateArray(rows, 3, 10).items).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps a too-high page onto the last page", () => {
    const result = paginateArray(rows, 99, 10);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
  });

  it("handles an empty array as a single empty page", () => {
    expect(paginateArray([], 1, 10)).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      totalCount: 0,
    });
  });
});

describe("getPageRange", () => {
  it("lists every page in full when there are 7 or fewer", () => {
    expect(getPageRange(1, 1)).toEqual([1]);
    expect(getPageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses with a trailing ellipsis near the start", () => {
    expect(getPageRange(2, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
  });

  it("collapses with a leading ellipsis near the end", () => {
    expect(getPageRange(9, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });

  it("collapses with ellipses on both sides in the middle", () => {
    expect(getPageRange(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });
});
