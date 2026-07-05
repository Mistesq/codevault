import { describe, expect, it } from "vitest";

import { formatLongDate } from "@/lib/dashboard-data";

describe("formatLongDate", () => {
  it("formats an ISO date as a long US date", () => {
    // Use midday UTC so the local-timezone shift can't roll the date backward.
    expect(formatLongDate("2026-07-05T12:00:00.000Z")).toBe("July 5, 2026");
  });

  it("handles a date-only ISO string", () => {
    expect(formatLongDate("2024-01-01T12:00:00.000Z")).toBe("January 1, 2024");
  });
});
