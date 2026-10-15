import type { Role } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
};

/** Returns the signed-in user fields that are safe to use for authorization. */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    role: user.role,
  };
}

/**
 * Verifies the user's role against the database.
 * Use this for sensitive operations to prevent JWT tampering.
 */
export async function verifyUserRole(
  userId: string,
  expectedRole: Role
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === expectedRole;
}

export async function requireUser(): Promise<AuthenticatedUser | null> {
  return getCurrentUser();
}

export function hasRole(
  user: Pick<AuthenticatedUser, "role"> | null | undefined,
  ...roles: Role[]
): boolean {
  return Boolean(user && roles.includes(user.role));
}

export async function requireRole(
  ...roles: Role[]
): Promise<AuthenticatedUser | null> {
  const user = await getCurrentUser();
  return hasRole(user, ...roles) ? user : null;
}

export function canManageVideo(
  user: Pick<AuthenticatedUser, "id" | "role"> | null | undefined,
  video: Pick<{ teacherId: string }, "teacherId">,
): boolean {
  return Boolean(user && (user.role === "ADMIN" || user.id === video.teacherId));
}

export function canViewVideo(
  user: Pick<AuthenticatedUser, "id" | "role"> | null | undefined,
  video: Pick<{ teacherId: string; isPublic: boolean }, "teacherId" | "isPublic">,
  hasEnrollment = false,
): boolean {
  if (video.isPublic) return true;
  if (!user) return false;

  return user.role === "ADMIN" || user.id === video.teacherId || hasEnrollment;
}

/**
 * Checks if user has a specific role AND verifies it against the database.
 * Use for sensitive operations like video upload, student management, etc.
 */
export async function hasRoleVerified(
  userId: string,
  role: Role
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === role;
}
