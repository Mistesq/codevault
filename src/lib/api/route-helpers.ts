import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Outcome of reading/validating a request body. On failure the caller returns
 * the ready-made `response` (a 400 with a friendly error); on success it uses
 * `data`. Mirrors the action layer's `parseActionInput` (`@/lib/actions/result`)
 * but shaped for route handlers, which return `Response`s rather than the
 * `ActionResult` object.
 */
export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Validate an already-parsed value against a Zod schema, collapsing the
 * repeated safeParse → first-issue-message → 400 boilerplate. On failure it
 * builds the 400 response so the caller can `if (!parsed.ok) return parsed.response`.
 */
export function parseWithSchema<S extends z.ZodType>(
  schema: S,
  body: unknown,
  fallback = "Invalid details.",
): ParsedBody<z.infer<S>> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? fallback },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Read a JSON request body and validate it against a Zod schema in one step —
 * the "parse JSON (400 on malformed) → validate (400 on invalid)" pair every
 * auth route repeats. Rate limiting stays in each route since its position
 * relative to this parse varies (some routes need the parsed email first).
 */
export async function parseJsonRequest<S extends z.ZodType>(
  request: Request,
  schema: S,
  fallback = "Invalid details.",
): Promise<ParsedBody<z.infer<S>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      ),
    };
  }
  return parseWithSchema(schema, body, fallback);
}
