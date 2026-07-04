import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit-test the action by mocking its collaborators: the auth session, the
// Gemini client, and the rate limiter. No real session or network. `vi.hoisted`
// makes the mocks available to the hoisted `vi.mock` factories.
const {
  auth,
  generateContent,
  generateContentStream,
  geminiConfigured,
  checkRateLimit,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
  geminiConfigured: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: () => auth() }));

vi.mock("@/lib/ai/client", () => ({
  AI_MODEL: "gemini-2.5-flash-lite",
  EXPLAIN_MODEL: "gemini-2.5-flash",
  isGeminiConfigured: () => geminiConfigured(),
  getGemini: () => ({ models: { generateContent, generateContentStream } }),
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: { ai: { limit: 20, window: "1 h", prefix: "ai" } },
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  retryAfterMessage: () => "1 minute",
}));

import {
  explainCode,
  generateAutoTags,
  generateDescription,
  optimizePrompt,
} from "@/actions/ai";

/** Build an async iterable of `{ text }` chunks to mock a Gemini stream. */
async function* streamChunks(...texts: string[]) {
  for (const text of texts) yield { text };
}

/** Drain a returned explanation stream into one string. */
async function readStream(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

const proSession = { user: { id: "user_1", isPro: true } };
const freeSession = { user: { id: "user_2", isPro: false } };

beforeEach(() => {
  vi.clearAllMocks();
  // Configured + signed-in Pro + allowed is the common baseline.
  geminiConfigured.mockReturnValue(true);
  checkRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
});

describe("generateAutoTags", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await generateAutoTags({ title: "T" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a Free user with the upgrade message", async () => {
    auth.mockResolvedValue(freeSession);

    const result = await generateAutoTags({ title: "T" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects when Gemini is not configured", async () => {
    auth.mockResolvedValue(proSession);
    geminiConfigured.mockReturnValue(false);

    const result = await generateAutoTags({ title: "T" });

    expect(result).toEqual({ success: false, error: "AI is not configured." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects an empty title (invalid input)", async () => {
    auth.mockResolvedValue(proSession);

    const result = await generateAutoTags({ title: "   " });

    expect(result.success).toBe(false);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns a friendly error when rate limited", async () => {
    auth.mockResolvedValue(proSession);
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

    const result = await generateAutoTags({ title: "T" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("1 minute") });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns normalized tags on the happy path", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockResolvedValue({ text: '{"tags":["React","react","Hooks"]}' });

    const result = await generateAutoTags({ title: "useEffect", content: "code" });

    expect(result).toEqual({ success: true, data: ["react", "hooks"] });
    const args = generateContent.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe("gemini-2.5-flash-lite");
    const config = args.config as Record<string, unknown>;
    expect(config.responseMimeType).toBe("application/json");
  });

  it("errors when the model returns no usable tags", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockResolvedValue({ text: "not json" });

    const result = await generateAutoTags({ title: "T" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("Try adding") });
  });

  it("maps a 429 / RESOURCE_EXHAUSTED to a friendly retry message", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED"));

    const result = await generateAutoTags({ title: "T" });

    expect(result).toEqual({
      success: false,
      error: "AI is busy right now. Please try again shortly.",
    });
  });

  it("returns a generic error on other AI failures", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateAutoTags({ title: "T" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong generating tags. Please try again.",
    });
    errorSpy.mockRestore();
  });
});

describe("generateDescription", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await generateDescription({ title: "T" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a Free user with the upgrade message", async () => {
    auth.mockResolvedValue(freeSession);

    const result = await generateDescription({ title: "T" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects when Gemini is not configured", async () => {
    auth.mockResolvedValue(proSession);
    geminiConfigured.mockReturnValue(false);

    const result = await generateDescription({ title: "T" });

    expect(result).toEqual({ success: false, error: "AI is not configured." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects when there is no usable signal (invalid input)", async () => {
    auth.mockResolvedValue(proSession);

    const result = await generateDescription({ title: "  ", content: "" });

    expect(result.success).toBe(false);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns a friendly error when rate limited", async () => {
    auth.mockResolvedValue(proSession);
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

    const result = await generateDescription({ title: "T" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("1 minute") });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns the normalized description on the happy path", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockResolvedValue({
      text: '"A React hook that debounces a value. It delays updates until input settles."',
    });

    const result = await generateDescription({
      title: "useDebounce",
      content: "code",
      type: "Snippet",
    });

    expect(result).toEqual({
      success: true,
      data: "A React hook that debounces a value. It delays updates until input settles.",
    });
    const args = generateContent.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe("gemini-2.5-flash-lite");
  });

  it("errors when the model returns nothing usable", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockResolvedValue({ text: "   " });

    const result = await generateDescription({ title: "T" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("Try adding") });
  });

  it("maps a 429 / RESOURCE_EXHAUSTED to a friendly retry message", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED"));

    const result = await generateDescription({ title: "T" });

    expect(result).toEqual({
      success: false,
      error: "AI is busy right now. Please try again shortly.",
    });
  });

  it("returns a generic error on other AI failures", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateDescription({ title: "T" });

    expect(result).toEqual({
      success: false,
      error:
        "Something went wrong generating the description. Please try again.",
    });
    errorSpy.mockRestore();
  });
});

describe("explainCode", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await explainCode({ content: "console.log(1)" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("rejects a Free user with the upgrade message", async () => {
    auth.mockResolvedValue(freeSession);

    const result = await explainCode({ content: "console.log(1)" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") });
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("rejects when Gemini is not configured", async () => {
    auth.mockResolvedValue(proSession);
    geminiConfigured.mockReturnValue(false);

    const result = await explainCode({ content: "console.log(1)" });

    expect(result).toEqual({ success: false, error: "AI is not configured." });
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("rejects empty content (invalid input)", async () => {
    auth.mockResolvedValue(proSession);

    const result = await explainCode({ content: "   " });

    expect(result.success).toBe(false);
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("returns a friendly error when rate limited", async () => {
    auth.mockResolvedValue(proSession);
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

    const result = await explainCode({ content: "console.log(1)" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("1 minute") });
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("streams the explanation on the happy path using the reasoning model", async () => {
    auth.mockResolvedValue(proSession);
    generateContentStream.mockResolvedValue(
      streamChunks("This code ", "logs a value."),
    );

    const result = await explainCode({
      content: "console.log(1)",
      language: "javascript",
      type: "Snippet",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(await readStream(result.stream)).toBe("This code logs a value.");

    const args = generateContentStream.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(args.model).toBe("gemini-2.5-flash");
  });

  it("maps an initial 429 / RESOURCE_EXHAUSTED to a friendly retry message", async () => {
    auth.mockResolvedValue(proSession);
    generateContentStream.mockRejectedValue(
      new Error("429 RESOURCE_EXHAUSTED"),
    );

    const result = await explainCode({ content: "console.log(1)" });

    expect(result).toEqual({
      success: false,
      error: "AI is busy right now. Please try again shortly.",
    });
  });

  it("returns a generic error on other AI failures", async () => {
    auth.mockResolvedValue(proSession);
    generateContentStream.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await explainCode({ content: "console.log(1)" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong explaining this code. Please try again.",
    });
    errorSpy.mockRestore();
  });
});

describe("optimizePrompt", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await optimizePrompt({ content: "Write a poem." });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a Free user with the upgrade message", async () => {
    auth.mockResolvedValue(freeSession);

    const result = await optimizePrompt({ content: "Write a poem." });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects when Gemini is not configured", async () => {
    auth.mockResolvedValue(proSession);
    geminiConfigured.mockReturnValue(false);

    const result = await optimizePrompt({ content: "Write a poem." });

    expect(result).toEqual({ success: false, error: "AI is not configured." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects empty content (invalid input)", async () => {
    auth.mockResolvedValue(proSession);

    const result = await optimizePrompt({ content: "   " });

    expect(result.success).toBe(false);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns a friendly error when rate limited", async () => {
    auth.mockResolvedValue(proSession);
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

    const result = await optimizePrompt({ content: "Write a poem." });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("1 minute") });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns the normalized prompt on the happy path using the reasoning model", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockResolvedValue({
      text: "```text\nWrite a vivid four-line poem about the sea.\n```",
    });

    const result = await optimizePrompt({ content: "write a poem" });

    expect(result).toEqual({
      success: true,
      data: "Write a vivid four-line poem about the sea.",
    });
    const args = generateContent.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe("gemini-2.5-flash");
  });

  it("errors when the model returns nothing usable", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockResolvedValue({ text: "   " });

    const result = await optimizePrompt({ content: "write a poem" });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("optimize") });
  });

  it("maps a 429 / RESOURCE_EXHAUSTED to a friendly retry message", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED"));

    const result = await optimizePrompt({ content: "write a poem" });

    expect(result).toEqual({
      success: false,
      error: "AI is busy right now. Please try again shortly.",
    });
  });

  it("returns a generic error on other AI failures", async () => {
    auth.mockResolvedValue(proSession);
    generateContent.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await optimizePrompt({ content: "write a poem" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong optimizing this prompt. Please try again.",
    });
    errorSpy.mockRestore();
  });
});
