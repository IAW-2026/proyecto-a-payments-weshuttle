import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isPaymentsApiRoute = createRouteMatcher(["/api/payments(.*)"]);
const isCheckoutRoute = createRouteMatcher(["/checkout(.*)"]);

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default clerkMiddleware(
  async (auth, request) => {
    const authState = await auth();
    const pathname = request.nextUrl.pathname;
    const method = request.method;

    // Check if the request is an API request
    if (pathname.startsWith("/api/")) {
      // 1. Omit verification for mock API routes
      if (pathname.startsWith("/api/mocks/")) {
        return NextResponse.next();
      }

      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        const internalKey = process.env.WESHUTTLE_INTERNAL_KEY;
        const analyticsKey = process.env.ANALYTICS_API_KEY;

        // If keys are not configured on the server, fail explicitly
        if (!internalKey && !analyticsKey) {
          console.warn(`[Auth] API Key authentication attempted on ${pathname} but server-side keys are not configured.`);
          return NextResponse.json(
            {
              error: "UNAUTHORIZED",
              message: "API Key authentication is not configured on the server.",
            },
            { status: 401 }
          );
        }

        const isInternal = internalKey ? safeCompare(token, internalKey) : false;
        const isAnalytics = analyticsKey ? safeCompare(token, analyticsKey) : false;

        if (isInternal) {
          console.info(`[Auth] Request authenticated via weshuttle-internal API Key for ${pathname}`);
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set("x-request-method", method);
          requestHeaders.set("x-request-pathname", pathname);
          requestHeaders.set("x-authenticated-service", "weshuttle-internal");
          requestHeaders.set("x-authenticated-scopes", "read,write");
          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
        }

        if (isAnalytics) {
          if (method === "GET") {
            console.info(`[Auth] Request authenticated via analytics API Key (read-only) for ${pathname}`);
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set("x-request-method", method);
            requestHeaders.set("x-request-pathname", pathname);
            requestHeaders.set("x-authenticated-service", "analytics");
            requestHeaders.set("x-authenticated-scopes", "read");
            return NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
          } else {
            console.warn(`[Auth] Write attempt rejected for analytics API Key on ${pathname}`);
            return NextResponse.json(
              {
                error: "FORBIDDEN",
                message: "Analytics API key only has read permissions.",
              },
              { status: 403 }
            );
          }
        }

        // Invalid key presented
        console.warn(`[Auth] Invalid API Key presented for ${pathname}`);
        return NextResponse.json(
          {
            error: "UNAUTHORIZED",
            message: "Invalid API Key.",
          },
          { status: 401 }
        );
      }
    }

    // User-based authentication rules (Clerk)
    if (isCheckoutRoute(request)) {
      if (!authState.userId) {
        return authState.redirectToSignIn({ returnBackUrl: request.url });
      }
    }

    if (isAdminRoute(request)) {
      if (!authState.userId) {
        return authState.redirectToSignIn({ returnBackUrl: request.url });
      }
    }

    if (isPaymentsApiRoute(request)) {
      if (!authState.userId) {
        return NextResponse.json(
          {
            error: "UNAUTHORIZED",
            message: "Authentication is required.",
          },
          { status: 401 },
        );
      }
    }

    // Always inject request method and pathname for downstream usage in requireApiRole
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-method", method);
    requestHeaders.set("x-request-pathname", pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  },
  {
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  },
);

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
