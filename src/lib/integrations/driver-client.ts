import { getAuthHeaders } from "./auth-header";

// Fallback to NEXT_PUBLIC_ if DRIVER_APP_URL is not set server-side
const DRIVER_APP_BASE_URL = (
  process.env.DRIVER_APP_URL || 
  process.env.NEXT_PUBLIC_DRIVER_APP_URL || 
  ""
).replace(/\/$/, ""); // Remove trailing slash

/**
 * Helper to check if Driver App URL is configured.
 */
export function isDriverConfigured(): boolean {
  return DRIVER_APP_BASE_URL.length > 0;
}

export type PaymentDeniedNotificationInput = {
  reservationId: string;
  passengerUserId: string;
};

/**
 * API client to interact with Driver App.
 */
export const driverClient = {
  /**
   * Notifies Driver App that a payment was denied/failed, so they can decrement occupancy.
   * POST /api/pools/:pool_id/payment-denied
   */
  async notifyPaymentDenied(
    poolId: string,
    input: PaymentDeniedNotificationInput
  ): Promise<boolean> {
    if (!isDriverConfigured()) {
      console.warn("driverClient.notifyPaymentDenied: DRIVER_APP_URL is not configured.");
      return false;
    }

    const url = `${DRIVER_APP_BASE_URL}/api/pools/${poolId}/payment-denied`;
    const headers = await getAuthHeaders();
    const body = {
      reservation_id: input.reservationId,
      passenger_user_id: input.passengerUserId,
    };

    console.info(`driverClient.notifyPaymentDenied: Sending POST to ${url}`, body);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`driverClient.notifyPaymentDenied failed: [${response.status}] ${errorText}`);
        return false;
      }

      console.info(`driverClient.notifyPaymentDenied succeeded for pool ${poolId}`);
      return true;
    } catch (error) {
      console.error(`driverClient.notifyPaymentDenied failed with exception for pool ${poolId}:`, error);
      return false;
    }
  },
};
