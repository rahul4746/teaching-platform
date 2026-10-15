import bcrypt from "bcryptjs";

export const PASSWORD_HASH_ROUNDS = 12;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

/** Hash a password with a deliberately expensive bcrypt work factor. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

/** Constant-time bcrypt comparison for credentials authentication. */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function originForRequest(request: Request): string | null {
  const configuredOrigin = normalizeOrigin(
    process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
  );

  if (configuredOrigin) return configuredOrigin;

  return normalizeOrigin(request.url);
}

/**
 * Browser mutations must originate from this application. Auth.js protects its
 * own endpoints separately; use this guard in every custom POST/PUT/PATCH/DELETE
 * route before parsing a request body.
 */
export function isSameOriginMutation(request: Request): boolean {
  const origin = normalizeOrigin(request.headers.get("origin") ?? undefined);
  const expectedOrigin = originForRequest(request);

  return origin !== null && expectedOrigin !== null && origin === expectedOrigin;
}

/** A small, reusable response payload for rejected state-changing requests. */
export function invalidMutationResponse() {
  return Response.json(
    { error: "Invalid request." },
    { status: 403, headers: NO_STORE_HEADERS },
  );
}

export function jsonNoStore<T>(body: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, max-age=0");

  return Response.json(body, { ...init, headers });
}

export function badRequest(message: string, init?: ResponseInit) {
  return jsonNoStore({ error: message }, { status: 400, ...init });
}

export function tooLarge(limitBytes: number) {
  return jsonNoStore(
    { error: `File exceeds the ${limitBytes} byte limit.` },
    { status: 413 },
  );
}

export function unsupportedMediaType() {
  return jsonNoStore({ error: "Unsupported media type." }, { status: 415 });
}

export function notFound(message = "Not found.") {
  return jsonNoStore({ error: message }, { status: 404 });
}
