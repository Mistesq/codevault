import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Reusable rate limiting for auth endpoints, backed by Upstash Redis with the
// sliding-window algorithm. The client is built lazily so a missing/unreachable
// Upstash config never crashes import or a request — rate limiting FAILS OPEN
// (allows the request) in that case.

export type RateLimitResult = {
  success: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  reset: number;
};

// Returned when Upstash isn't configured or a check fails — allow the request.
const ALLOW: RateLimitResult = { success: true, remaining: Infinity, reset: 0 };

// Per-endpoint limits. Keyed names map to the spec's protection table.
export const RATE_LIMITS = {
  login: { limit: 5, window: "15 m", prefix: "login" },
  register: { limit: 3, window: "1 h", prefix: "register" },
  passwordResetRequest: { limit: 3, window: "1 h", prefix: "pw-reset-request" },
  passwordReset: { limit: 5, window: "15 m", prefix: "pw-reset" },
  resendVerification: { limit: 3, window: "15 m", prefix: "resend-verify" },
  // AI features are keyed per-user (not per-IP). The Gemini free-tier RPM/RPD
  // quota is shared per-project across all users, so this is a fairness guard to
  // stop one account exhausting the shared daily budget — not the real ceiling.
  ai: { limit: 20, window: "1 h", prefix: "ai" },
} as const satisfies Record<
  string,
  { limit: number; window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`; prefix: string }
>;

export type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

// Resolve the Redis client once. `undefined` = not yet checked, `null` = not
// configured (fail open).
let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;

  if (!redisClient) {
    console.warn(
      "Upstash Redis is not configured — auth rate limiting is disabled (failing open).",
    );
  }
  return redisClient;
}

// One Ratelimit instance per config; reused across requests.
const limiters = new Map<string, Ratelimit>();

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  let limiter = limiters.get(config.prefix);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: `ratelimit:${config.prefix}`,
    });
    limiters.set(config.prefix, limiter);
  }
  return limiter;
}

/**
 * Check (and consume) a request against a rate limit. Fails open on any error.
 *
 * @param config One of `RATE_LIMITS`.
 * @param identifier The key to limit by — e.g. an IP, or `${ip}:${email}`.
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(config);
  if (!limiter) return ALLOW;

  try {
    const { success, remaining, reset } = await limiter.limit(identifier);
    return { success, remaining, reset };
  } catch (error) {
    console.error("Rate limit check failed — failing open:", error);
    return ALLOW;
  }
}

/**
 * Best-effort client IP from proxy headers. Vercel sets `x-forwarded-for`; the
 * first entry is the originating client. Falls back to a constant so local
 * requests (no header) still share a single bucket.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/** Seconds until `reset` (Unix ms), at least 1. */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/** Human-friendly "X minute(s)" for a 429 message. */
export function retryAfterMessage(reset: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds(reset) / 60));
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/**
 * Standard 429 response for API routes: friendly JSON error + `Retry-After`
 * header (seconds).
 */
export function tooManyRequestsResponse(reset: number): NextResponse {
  return NextResponse.json(
    {
      error: `Too many attempts. Please try again in ${retryAfterMessage(reset)}.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds(reset)) },
    },
  );
}
