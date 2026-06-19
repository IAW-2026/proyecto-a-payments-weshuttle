import { auth } from "@clerk/nextjs/server";

/**
 * Generates the common headers for inter-app server-to-server requests.
 * If a rider or driver is logged in, propagates their Clerk JWT session token
 * as `Authorization: Bearer <token>`.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  try {
    const authState = await auth();
    if (authState?.userId) {
      const token = await authState.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    // Gracefully fallback when called outside of request context, e.g., in edge cases, tests, or background tasks
    console.debug("getAuthHeaders: failed to retrieve Clerk auth context, proceeding without Authorization header", error);
  }

  return headers;
}
