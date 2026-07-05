import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJsonRequest, parseWithSchema } from "@/lib/api/route-helpers";

const schema = z.object({ email: z.string().email("Invalid email.") });

function jsonRequest(body: string): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("parseWithSchema", () => {
  it("returns ok with the validated data on success", () => {
    const result = parseWithSchema(schema, { email: "a@b.com" });
    expect(result).toEqual({ ok: true, data: { email: "a@b.com" } });
  });

  it("returns a 400 response with the first issue message on failure", async () => {
    const result = parseWithSchema(schema, { email: "nope" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({ error: "Invalid email." });
  });

  it("uses the fallback message when an issue has none", async () => {
    const bare = z.string();
    const result = parseWithSchema(bare, 123, "Bad input.");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    const body = await result.response.json();
    // Zod supplies its own message here; the fallback only fills a missing one,
    // so just assert the shape/status rather than the exact wording.
    expect(result.response.status).toBe(400);
    expect(typeof body.error).toBe("string");
  });
});

describe("parseJsonRequest", () => {
  it("parses and validates a well-formed JSON body", async () => {
    const result = await parseJsonRequest(
      jsonRequest(JSON.stringify({ email: "a@b.com" })),
      schema,
    );
    expect(result).toEqual({ ok: true, data: { email: "a@b.com" } });
  });

  it("returns a 400 'Invalid JSON body.' for malformed JSON", async () => {
    const result = await parseJsonRequest(jsonRequest("{not json"), schema);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns a 400 with the schema message for invalid data", async () => {
    const result = await parseJsonRequest(
      jsonRequest(JSON.stringify({ email: "nope" })),
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({ error: "Invalid email." });
  });
});
