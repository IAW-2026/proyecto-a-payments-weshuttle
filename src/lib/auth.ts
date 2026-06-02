import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { type AppRole, type RoleCarrier, readRoleFromClaims } from "@/lib/clerk-roles";

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

export async function getAuthContext() {
  const { authState, role } = await resolveAuthState();

  if (!authState.userId) {
    return {
      clerkUserId: null,
      role: null,
      redirectToSignIn: authState.redirectToSignIn,
    };
  }

  return {
    clerkUserId: authState.userId,
    role,
    redirectToSignIn: authState.redirectToSignIn,
  };
}

export async function getAuthDiagnostics() {
  const { authState, role, diagnostics } = await resolveAuthState();

  return {
    clerkUserId: authState.userId ?? null,
    role,
    diagnostics,
  };
}

export async function requirePageRole(allowedRoles: readonly AppRole[]) {
  const context = await getAuthContext();

  if (!context.clerkUserId) {
    return context.redirectToSignIn();
  }

  if (!context.role || !allowedRoles.includes(context.role)) {
    notFound();
  }

  return context;
}

export async function requireApiRole(allowedRoles: readonly AppRole[]) {
  const context = await getAuthContext();

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
