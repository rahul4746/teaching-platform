import { auth } from "@/auth";
import { jsonNoStore } from "@/lib/security";
import { getClientIdentifier, authRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = authRateLimiter(getClientIdentifier(request));
  if (rateLimitResult && !rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    return jsonNoStore(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return jsonNoStore({ ok: true });
  }

  // In a real app with Redis, you would:
  // 1. Add the session token to a blocklist with TTL = session expiry
  // 2. Or use a database-backed session store with revocation
  // For now, client-side signOut with redirect handles the cookie clearing

  return jsonNoStore({ ok: true });
}