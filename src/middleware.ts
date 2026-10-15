import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

function addSecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export default async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // 1. If user is authenticated and tries to access auth pages, redirect to home
  if (session && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  // 2. If user is NOT authenticated and tries to access protected pages
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isPublicPage = pathname === "/" || pathname.startsWith("/api/auth");

  if (!session && !isAuthPage && !isPublicPage) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/sign-in", request.url)));
  }

  // 3. Role-based access control (example)
  // if (pathname.startsWith("/teacher") && session?.user.role !== "TEACHER") {
  //   return NextResponse.redirect(new URL("/", request.url));
  // }

  return addSecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
