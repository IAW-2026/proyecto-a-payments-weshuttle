import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { type AppRole, type RoleCarrier, readRoleFromClaims } from "@/lib/clerk-roles";

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

type RoleDiagnostics = {
  sessionRole: unknown;
  sessionMetadataRole: unknown;
  sessionPublicMetadataRole: unknown;
  sessionUnsafeMetadataRole: unknown;
  userPublicMetadataRole: unknown;
  userUnsafeMetadataRole: unknown;
};

async function resolveAuthState() {
  const authState = await auth();

  if (!authState.userId) {
    return {
      authState,
      role: null,
      diagnostics: null,
    };
  }

  const sessionClaims = authState.sessionClaims as RoleCarrier | undefined;
  const user = await currentUser();
  const metadataCarrier: RoleCarrier = {
    publicMetadata: user?.publicMetadata as RoleCarrier["publicMetadata"],
    unsafeMetadata: user?.unsafeMetadata as RoleCarrier["unsafeMetadata"],
  };

  const role =
    readRoleFromClaims(sessionClaims) ?? readRoleFromClaims(metadataCarrier);

  const diagnostics: RoleDiagnostics = {
    sessionRole: sessionClaims?.role,
    sessionMetadataRole: sessionClaims?.metadata?.role,
    sessionPublicMetadataRole: sessionClaims?.publicMetadata?.role,
    sessionUnsafeMetadataRole: sessionClaims?.unsafeMetadata?.role,
    userPublicMetadataRole: user?.publicMetadata?.role,
    userUnsafeMetadataRole: user?.unsafeMetadata?.role,
  };

  return {
    authState,
    role,
    diagnostics,
  };
}

export type AuthContext =
  | {
      type: "user";
      clerkUserId: string;
      role: AppRole | null;
      redirectToSignIn: () => unknown;
    }
  | {
      type: "service";
      service: "weshuttle-internal" | "analytics";
      scopes: ("read" | "write")[];
      clerkUserId: null;
      role: null;
      redirectToSignIn: null;
    }
  | {
      type: "unauthenticated";
      clerkUserId: null;
      role: null;
      error?: string;
      redirectToSignIn: () => unknown;
    };

export async function getAuthContext(): Promise<AuthContext> {
  // First, check if there is an Authorization header with an API Key
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const method = headersList.get("x-request-method") || "GET";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const internalKey = process.env.WESHUTTLE_INTERNAL_KEY;
      const analyticsKey = process.env.ANALYTICS_API_KEY;

      // Reject API Key auth if no keys are configured
      if (!internalKey && !analyticsKey) {
        console.warn("[Auth] API Key presented but no API keys configured on server.");
        return {
          type: "unauthenticated",
          clerkUserId: null,
          role: null,
          error: "API Key authentication is not configured on the server.",
          redirectToSignIn: () => {
            throw new Error("API Key authenticated request cannot be redirected to sign in.");
          },
        };
      }

      const isInternal = internalKey ? safeCompare(token, internalKey) : false;
      const isAnalytics = analyticsKey ? safeCompare(token, analyticsKey) : false;

      if (isInternal) {
        console.info(`[Auth] Service authorized: weshuttle-internal`);
        return {
          type: "service",
          service: "weshuttle-internal",
          scopes: ["read", "write"],
          clerkUserId: null,
          role: null,
          redirectToSignIn: null,
        };
      }

      if (isAnalytics) {
        if (method === "GET") {
          console.info(`[Auth] Service authorized: analytics (read-only)`);
          return {
            type: "service",
            service: "analytics",
            scopes: ["read"],
            clerkUserId: null,
            role: null,
            redirectToSignIn: null,
          };
        } else {
          console.warn(`[Auth] Service unauthorized: analytics API key attempted write method ${method}`);
          return {
            type: "unauthenticated",
            clerkUserId: null,
            role: null,
            error: "Analytics API key only has read permissions.",
            redirectToSignIn: () => {
              throw new Error("API Key authenticated request cannot be redirected to sign in.");
            },
          };
        }
      }

      // Invalid token
      console.warn("[Auth] Service unauthorized: invalid API Key presented.");
      return {
        type: "unauthenticated",
        clerkUserId: null,
        role: null,
        error: "Invalid API Key.",
        redirectToSignIn: () => {
          throw new Error("API Key authenticated request cannot be redirected to sign in.");
        },
      };
    }
  } catch (error) {
    // Fallback if headers are not available (e.g. static generation)
    console.debug("getAuthContext: failed to check headers, falling back to Clerk auth", error);
  }

  // Fallback to original Clerk user session authentication
  const { authState, role } = await resolveAuthState();

  if (!authState || !authState.userId) {
    return {
      type: "unauthenticated",
      clerkUserId: null,
      role: null,
      redirectToSignIn: authState?.redirectToSignIn || (() => {
        throw new Error("No redirect function available.");
      }),
    };
  }

  console.info(`[Auth] User authorized: ${authState.userId} (role: ${role})`);
  return {
    type: "user",
    clerkUserId: authState.userId,
    role,
    redirectToSignIn: authState.redirectToSignIn,
  };
}

export async function getAuthDiagnostics() {
  const { authState, role, diagnostics } = await resolveAuthState();

  return {
    clerkUserId: authState?.userId ?? null,
    role,
    diagnostics,
  };
}

export async function requirePageRole(allowedRoles: readonly AppRole[]) {
  const context = await getAuthContext();

  if (context.type !== "user" || !context.clerkUserId) {
    if (context.redirectToSignIn) {
      await context.redirectToSignIn();
    }
    notFound();
  }

  if (!context.role || !allowedRoles.includes(context.role)) {
    notFound();
  }

  return context as {
    type: "user";
    clerkUserId: string;
    role: AppRole;
    redirectToSignIn: () => unknown;
  };
}

export async function requireApiRole(allowedRoles: readonly AppRole[]) {
  const context = await getAuthContext();

  // 1. Service accounts (API Keys) authentication handler
  if (context.type === "service") {
    if (context.service === "weshuttle-internal") {
      return {
        ok: true as const,
        context,
      };
    }

    if (context.service === "analytics") {
      // Additional safety check for non-GET methods on the analytics key
      try {
        const headersList = await headers();
        const method = headersList.get("x-request-method") || "GET";
        if (method !== "GET") {
          return {
            ok: false as const,
            response: NextResponse.json(
              {
                error: "FORBIDDEN",
                message: "Analytics API key only has read permissions.",
              },
              { status: 403 },
            ),
          };
        }
      } catch (error) {
        console.debug("requireApiRole: failed to read headers for analytics service check", error);
      }

      return {
        ok: true as const,
        context,
      };
    }
  }

  // 2. Unauthenticated handler
  if (context.type === "unauthenticated") {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: context.error || "Authentication is required.",
        },
        { status: 401 },
      ),
    };
  }

  // 3. User session (Clerk) handler
  if (!context.clerkUserId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
        { status: 401 },
      ),
    };
  }

  if (!context.role || !allowedRoles.includes(context.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "You do not have access to this resource.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    context,
  };
}

