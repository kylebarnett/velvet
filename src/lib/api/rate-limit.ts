import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Distributed rate limiter (Upstash Redis) with in-memory fallback
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }
  return null;
}

// Cache of Upstash Ratelimit instances keyed by "maxAttempts:windowMs"
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(
  maxAttempts: number,
  windowMs: number,
): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${maxAttempts}:${windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(maxAttempts, `${windowMs} ms`),
      prefix: "velvet:rl",
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback (single-instance only)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, { count: number; resetAt: number }>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (entry.resetAt <= now) memoryStore.delete(key);
    }
  }, 60_000);
}

function checkMemoryRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

// ---------------------------------------------------------------------------
// Public API — tries Upstash first, falls back to in-memory
// ---------------------------------------------------------------------------

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  // Synchronous path: Upstash requires async, so we use the in-memory
  // fallback for the synchronous call signature. The async version below
  // is preferred for new code.
  return checkMemoryRateLimit(key, maxAttempts, windowMs);
}

/**
 * Async rate limit check — uses Upstash Redis when configured,
 * falls back to in-memory otherwise.
 */
export async function checkRateLimitAsync(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const limiter = getUpstashLimiter(maxAttempts, windowMs);
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        retryAfter: result.success
          ? 0
          : Math.ceil((result.reset - Date.now()) / 1000),
      };
    } catch {
      // Redis unavailable — fall back to in-memory
      return checkMemoryRateLimit(key, maxAttempts, windowMs);
    }
  }
  return checkMemoryRateLimit(key, maxAttempts, windowMs);
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
