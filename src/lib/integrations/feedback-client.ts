import { getAuthHeaders } from "./auth-header";

// Fallback to NEXT_PUBLIC_ if FEEDBACK_APP_URL is not set server-side
const FEEDBACK_APP_BASE_URL = (
  process.env.FEEDBACK_APP_URL || 
  process.env.NEXT_PUBLIC_FEEDBACK_APP_URL || 
  ""
).replace(/\/$/, ""); // Remove trailing slash

/**
 * Helper to check if Feedback App URL is configured.
 */
export function isFeedbackConfigured(): boolean {
  return FEEDBACK_APP_BASE_URL.length > 0;
}

export type FeedbackUserRatingResponse = {
  userId: string;
  role: string;
  averageRating: number | null;
  totalReviews: number;
};

/**
 * API client to interact with Feedback App.
 */
export const feedbackClient = {
  /**
   * Fetches user rating stats from Feedback App.
   * GET /api/ratings/:user_id?role=...
   */
  async getUserRating(
    userId: string,
    role?: "driver" | "rider"
  ): Promise<FeedbackUserRatingResponse | null> {
    if (!isFeedbackConfigured()) {
      console.warn("feedbackClient.getUserRating: FEEDBACK_APP_URL is not configured.");
      return null;
    }

    const queryParams = new URLSearchParams();
    if (role) {
      queryParams.set("role", role);
    }

    const queryString = queryParams.toString();
    const url = `${FEEDBACK_APP_BASE_URL}/api/ratings/${userId}${queryString ? `?${queryString}` : ""}`;
    const headers = await getAuthHeaders();

    console.info(`feedbackClient.getUserRating: Requesting ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`feedbackClient.getUserRating failed: [${response.status}] ${errorText}`);
        return null;
      }

      const data = await response.json();

      return {
        userId: data.user_id || userId,
        role: data.role || role || "",
        averageRating: data.average_rating !== undefined ? data.average_rating : null,
        totalReviews: data.total_reviews !== undefined ? Number(data.total_reviews) : 0,
      };
    } catch (error) {
      console.error(`feedbackClient.getUserRating failed with exception:`, error);
      return null;
    }
  },
};
