import { describe, expect, it } from "vitest";
import {
  getClientIp,
  retryAfterMessage,
  retryAfterSeconds,
} from "@/lib/rate-limit";

describe("getClientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 70.41.3.18, 150.172.238.178",
    });
    expect(getClientIp(headers)).toBe("203.0.113.1");
  });

  it("trims whitespace around the forwarded ip", () => {
    const headers = new Headers({ "x-forwarded-for": "  203.0.113.9  , 10.0.0.1" });
    expect(getClientIp(headers)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip when there is no forwarded header", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.7" });
    expect(getClientIp(headers)).toBe("198.51.100.7");
  });

  it("falls back to localhost when no ip headers are present", () => {
    expect(getClientIp(new Headers())).toBe("127.0.0.1");
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up the seconds until reset", () => {
    const reset = Date.now() + 4200;
    expect(retryAfterSeconds(reset)).toBe(5);
  });

  it("never returns less than 1 for a past reset", () => {
    expect(retryAfterSeconds(Date.now() - 10_000)).toBe(1);
  });
});

describe("retryAfterMessage", () => {
  it("renders singular minutes", () => {
    expect(retryAfterMessage(Date.now() + 30_000)).toBe("1 minute");
  });

  it("renders plural minutes, rounding up", () => {
    expect(retryAfterMessage(Date.now() + 61_000)).toBe("2 minutes");
  });
});
