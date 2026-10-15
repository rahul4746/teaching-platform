import { jsonNoStore } from "@/lib/security";

// In-memory store for rate limiting (use Redis/Upstash in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimit(
    identifier: string,
    _request?: Request
  ): { success: boolean; remaining: number; resetTime: number } | null {
    const now = Date.now();
    const key = identifier;
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      const resetTime = now + config.windowMs;
      rateLimitStore.set(key, { count: 1, resetTime });
      return { success: true, remaining: config.maxRequests - 1, resetTime };
    }

    if (entry.count >= config.maxRequests) {
      return { success: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count += 1;
    return { success: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
  };
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 attempts per 15 minutes
  message: "Too many authentication attempts. Please try again later.",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: "Too many requests. Please slow down.",
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  message: "Upload limit reached. Please try again later.",
});

export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip = cfConnectingIp || realIp || forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}

export function applyRateLimit(
  request: Request,
  limiter: ReturnType<typeof createRateLimiter>,
  customKey?: string
): { success: boolean; response: Response | null } {
  const identifier = customKey || getClientIdentifier(request);
  const result = limiter(identifier, request);

  if (!result || !result.success) {
    const resetTime = result?.resetTime || Date.now() + 60_000;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    const response = jsonNoStore(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(configForLimiter(limiter).maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
        },
      }
    );

    return { success: false, response };
  }

  return { success: true, response: null };
}

function configForLimiter(
  limiter: ReturnType<typeof createRateLimiter>
): { maxRequests: number } {
  // This is a bit hacky but works for our pre-configured limiters
  if (limiter === authRateLimiter) return { maxRequests: 10 };
  if (limiter === apiRateLimiter) return { maxRequests: 60 };
  if (limiter === uploadRateLimiter) return { maxRequests: 20 };
  return { maxRequests: 60 };
}

// Helper to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: Response,
  limiter: ReturnType<typeof createRateLimiter>,
  identifier: string
): Response {
  const config = configForLimiter(limiter);
  const result = limiter(identifier);
  if (result) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("X-RateLimit-Limit", String(config.maxRequests));
    newResponse.headers.set("X-RateLimit-Remaining", String(result.remaining));
    newResponse.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetTime / 1000)));
    return newResponse;
  }
  return response;
}