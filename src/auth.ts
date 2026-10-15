import type { Role } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/security";
import { credentialsSchema } from "@/lib/validation";
import { authRateLimiter } from "@/lib/rate-limit";

// Used only to make failed lookups take approximately the same time as a
// failed password check. It is not a credential or application secret.
const DUMMY_PASSWORD_HASH =
  "$2b$12$atePzUmbbIah4mLHapBGneW8k0IFaWNM/zLYYoY/oGkLMbPlVoh2W";

// In-memory store for failed login tracking
const failedLoginStore = new Map<string, { count: number; lockUntil: number }>();

function checkFailedLogins(email: string): boolean {
  const entry = failedLoginStore.get(email);
  if (!entry) return true;
  if (entry.lockUntil > Date.now()) return false;
  if (entry.count >= 5) {
    entry.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
    return false;
  }
  return true;
}

function recordFailedLogin(email: string) {
  const entry = failedLoginStore.get(email) || { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockUntil = Date.now() + 15 * 60 * 1000;
  }
  failedLoginStore.set(email, entry);
}

function clearFailedLogins(email: string) {
  failedLoginStore.delete(email);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24,
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          autocomplete: "email",
        },
        password: {
          label: "Password",
          type: "password",
          autocomplete: "current-password",
        },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) return null;

        // Check for account lockout
        const email = parsed.data.email;
        if (!checkFailedLogins(email)) {
          return null; // Account temporarily locked
        }

        try {
          const user = await db.user.findUnique({
            where: { email },
            select: {
              id: true,
              name: true,
              email: true,
              passwordHash: true,
              role: true,
            },
          });
          const passwordIsValid = await verifyPassword(
            parsed.data.password,
            user?.passwordHash ?? DUMMY_PASSWORD_HASH,
          );

          // Deliberately return the same generic Auth.js credentials failure for
          // a missing user, a bad password, or an unexpected lookup failure.
          if (!user || !passwordIsValid) {
            recordFailedLogin(email);
            return null;
          }

          clearFailedLogins(email);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id && token.role) {
        session.user = {
          ...session.user,
          id: String(token.id),
          role: token.role as Role,
        };
      }

      return session;
    },
  },
});
