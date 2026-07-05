import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit-test the shared AI guard by mocking its collaborators: the Gemini config
// check, the rate limiter, and the provider-error detector. `vi.hoisted` makes
// the mocks available to the hoisted `vi.mock` factories. plan.ts is pure, so we
// use the real PLAN_LIMIT_MESSAGES.
const { geminiConfigured, checkRateLimit, rateLimitError } = vi.hoisted(() => ({
  geminiConfigured: vi.fn(),
  checkRateLimit: vi.fn(),
  rateLimitError: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  isGeminiConfigured: () => geminiConfigured(),
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: { ai: { limit: 20, window: "1 h", prefix: "ai" } },
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  retryAfterMessage: () => "1 minute",
}));

vi.mock("@/lib/ai/tagging", () => ({
  isRateLimitError: (error: unknown) => rateLimitError(error),
}));

import { AI_BUSY_ERROR, mapAiError, requireAiAccess } from "@/lib/ai/guard";
import { PLAN_LIMIT_MESSAGES } from "@/lib/billing/plan";

beforeEach(() => {
  vi.clearAllMocks();
  // Configured + allowed + not a provider quota error is the common baseline.
  geminiConfigured.mockReturnValue(true);
  checkRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
  rateLimitError.mockReturnValue(false);
});

describe("requireAiAccess", () => {
  it("rejects a Free user with the upgrade CTA and never hits the rate limiter", async () => {
    const result = await requireAiAccess("user_1", false);

    expect(result).toEqual({ ok: false, error: PLAN_LIMIT_MESSAGES.ai });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("rejects when Gemini is not configured", async () => {
    geminiConfigured.mockReturnValue(false);

    const result = await requireAiAccess("user_1", true);

    expect(result).toEqual({ ok: false, error: "AI is not configured." });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("rejects when rate limited, using the given quota noun", async () => {
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

    const result = await requireAiAccess("user_1", true, "suggestions");

    expect(result).toEqual({
      ok: false,
      error: "You've used your AI suggestions for now. Try again in 1 minute.",
    });
  });

  it("defaults the quota noun to 'requests'", async () => {
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

    const result = await requireAiAccess("user_1", true);

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("AI requests"),
    });
  });

  it("allows a configured, under-limit Pro user and keys the limit by user id", async () => {
    const result = await requireAiAccess("user_1", true);

    expect(result).toEqual({ ok: true });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "ai" }),
      "user_1",
    );
  });
});

describe("mapAiError", () => {
  it("maps a provider quota error to the friendly busy message without logging", () => {
    rateLimitError.mockReturnValue(true);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = mapAiError(new Error("429"), "label:", "fallback");

    expect(result).toEqual({ success: false, error: AI_BUSY_ERROR });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("logs under the label and returns the fallback for other errors", () => {
    rateLimitError.mockReturnValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("network down");

    const result = mapAiError(error, "Explain code failed:", "generic message");

    expect(result).toEqual({ success: false, error: "generic message" });
    expect(errorSpy).toHaveBeenCalledWith("Explain code failed:", error);
    errorSpy.mockRestore();
  });
});
