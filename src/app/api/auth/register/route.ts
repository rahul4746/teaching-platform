import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  hashPassword,
  invalidMutationResponse,
  isSameOriginMutation,
  jsonNoStore,
} from "@/lib/security";
import { registrationSchema } from "@/lib/validation";
import { authRateLimiter, getClientIdentifier } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REGISTRATION_BODY_BYTES = 10_000;
const REGISTRATION_FAILURE = {
  error: "Unable to create account. Please check your details and try again.",
};

function registrationFailure() {
  return jsonNoStore(REGISTRATION_FAILURE, { status: 400 });
}

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = authRateLimiter(getClientIdentifier(request));
  if (rateLimitResult && !rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    return jsonNoStore(
      { error: "Too many registration attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  if (!isSameOriginMutation(request)) {
    return invalidMutationResponse();
  }

  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length"));

  if (
    !contentType.toLowerCase().startsWith("application/json") ||
    (Number.isFinite(contentLength) && contentLength > MAX_REGISTRATION_BODY_BYTES)
  ) {
    return registrationFailure();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return registrationFailure();
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return registrationFailure();

  try {
    const passwordHash = await hashPassword(parsed.data.password);

    await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
    });

    return jsonNoStore({ ok: true }, { status: 201 });
  } catch (error) {
    // Unique constraint failures intentionally use the same response as every
    // other registration failure, so this route does not disclose an email's
    // registration state through error text.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return registrationFailure();
    }

    return registrationFailure();
  }
}
