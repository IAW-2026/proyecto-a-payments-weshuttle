export const APP_ROLES = ["rider", "driver", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type RoleClaims = {
  role?: unknown;
  metadata?: {
    role?: unknown;
  };
  publicMetadata?: {
    role?: unknown;
  };
  unsafeMetadata?: {
    role?: unknown;
  };
};

export type RoleCarrier = RoleClaims & {
  publicMetadata?: {
    role?: unknown;
  };
  unsafeMetadata?: {
    role?: unknown;
  };
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function readRoleFromClaims(claims: RoleCarrier | null | undefined) {
  const roleCandidates = [
    claims?.role,
    claims?.metadata?.role,
    claims?.publicMetadata?.role,
    claims?.unsafeMetadata?.role,
  ];

  for (const candidate of roleCandidates) {
    if (isAppRole(candidate)) {
      return candidate;
    }
  }

  return null;
}
