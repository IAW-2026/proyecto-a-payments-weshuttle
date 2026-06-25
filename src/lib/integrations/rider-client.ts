import { getAuthHeaders } from "./auth-header";
import type {
  ExternalCreditAdjustmentInput,
  ExternalCreditAdjustmentResponse,
  ExternalPaymentResultInput,
  ExternalPaymentResultResponse,
  ExternalPoolPassengersFilter,
  ExternalPoolPassengersResponse,
  ExternalReservationStatus,
  ExternalPaymentStatus,
} from "@/lib/external-apis/types";

interface RemotePassenger {
  reservation_id: string;
  passenger_user_id: string;
  passenger_name?: string;
  reservation_status: ExternalReservationStatus;
  payment_status: ExternalPaymentStatus;
  pickup_point?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  destination_id: string;
  departure_time: string;
  max_price: number;
  amount_charged: number;
  credit_applied: number;
  final_trip_price?: number | null;
  credit_granted: number;
  currency?: string;
}

// Fallback to NEXT_PUBLIC_ if RIDER_APP_URL is not set server-side
const RIDER_APP_BASE_URL = (
  process.env.RIDER_APP_URL || 
  process.env.NEXT_PUBLIC_RIDER_APP_URL || 
  ""
).replace(/\/$/, ""); // Remove trailing slash

/**
 * Helper to check if Rider App URL is configured.
 */
export function isRiderConfigured(): boolean {
  return RIDER_APP_BASE_URL.length > 0;
}

/**
 * API client to interact with Rider App.
 */
export const riderClient = {
  /**
   * Fetches the passenger manifest of a pool from Rider App.
   * GET /api/pools/:pool_id/passengers
   */
  async getPoolPassengers(
    poolId: string,
    filter?: ExternalPoolPassengersFilter
  ): Promise<ExternalPoolPassengersResponse | null> {
    if (!isRiderConfigured()) {
      console.warn("riderClient.getPoolPassengers: RIDER_APP_URL is not configured.");
      return null;
    }

    const queryParams = new URLSearchParams();
    if (filter?.reservationStatus) {
      queryParams.set("reservation_status", filter.reservationStatus);
    }
    if (filter?.paymentStatus) {
      queryParams.set("payment_status", filter.paymentStatus);
    }

    const queryString = queryParams.toString();
    const url = `${RIDER_APP_BASE_URL}/api/pools/${poolId}/passengers${queryString ? `?${queryString}` : ""}`;
    const headers = await getAuthHeaders();

    console.info(`riderClient.getPoolPassengers: Requesting ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`riderClient.getPoolPassengers: Pool ${poolId} not found on Rider App (404).`);
        return null;
      }
      const errorText = await response.text();
      console.error(`riderClient.getPoolPassengers failed: [${response.status}] ${errorText}`);
      throw new Error(`Rider App passenger lookup failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Map snake_case response payload to camelCase model structure used in Payments App
    const passengers = Array.isArray(data.passengers)
      ? (data.passengers as RemotePassenger[]).map((p) => ({
          reservationId: p.reservation_id,
          passengerUserId: p.passenger_user_id,
          passengerName: p.passenger_name || p.passenger_user_id,
          reservationStatus: p.reservation_status,
          paymentStatus: p.payment_status,
          pickupPoint: p.pickup_point ? {
            address: p.pickup_point.address || "",
            lat: Number(p.pickup_point.lat) || 0,
            lng: Number(p.pickup_point.lng) || 0,
          } : { address: "", lat: 0, lng: 0 },
          destinationId: p.destination_id,
          departureTime: p.departure_time,
          maxPrice: Number(p.max_price) || 0,
          amountCharged: Number(p.amount_charged) || 0,
          creditApplied: Number(p.credit_applied) || 0,
          finalTripPrice: p.final_trip_price !== undefined && p.final_trip_price !== null ? Number(p.final_trip_price) : null,
          creditGranted: Number(p.credit_granted) || 0,
          currency: p.currency || "ARS",
        }))
      : [];

    return {
      poolId: data.pool_id || poolId,
      passengers,
    };
  },

  /**
   * Notifies Rider App of a reservation's payment status outcome.
   * PATCH /api/reservations/:reservation_id/payment-result
   */
  async notifyPaymentResult(
    reservationId: string,
    input: ExternalPaymentResultInput
  ): Promise<ExternalPaymentResultResponse | null> {
    if (!isRiderConfigured()) {
      console.warn("riderClient.notifyPaymentResult: RIDER_APP_URL is not configured.");
      return null;
    }

    const url = `${RIDER_APP_BASE_URL}/api/reservations/${reservationId}/payment-result`;
    const headers = await getAuthHeaders();
    const body = {
      payment_status: input.paymentStatus,
      transaction_id: input.transactionId,
      max_price: input.maxPrice,
      credit_applied: input.creditApplied,
      amount_charged: input.amountCharged,
      currency: input.currency,
      rejection_reason: input.rejectionReason,
      processed_at: input.processedAt,
    };

    console.info(`riderClient.notifyPaymentResult: Sending PATCH to ${url}`, body);

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`riderClient.notifyPaymentResult failed: [${response.status}] ${errorText}`);
      throw new Error(`Rider App payment notification failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      reservation_id: data.reservation_id || reservationId,
      payment_status: data.payment_status,
      reservation_status: data.reservation_status,
      max_price: data.max_price !== undefined ? Number(data.max_price) : undefined,
      credit_applied: data.credit_applied !== undefined ? Number(data.credit_applied) : undefined,
      amount_charged: data.amount_charged !== undefined ? Number(data.amount_charged) : undefined,
    };
  },

  /**
   * Notifies Rider App of a credit adjustment generated after pool price finalization.
   * PATCH /api/reservations/:reservation_id/credit-adjustment
   */
  async notifyCreditAdjustment(
    reservationId: string,
    input: ExternalCreditAdjustmentInput
  ): Promise<ExternalCreditAdjustmentResponse | null> {
    if (!isRiderConfigured()) {
      console.warn("riderClient.notifyCreditAdjustment: RIDER_APP_URL is not configured.");
      return null;
    }

    const url = `${RIDER_APP_BASE_URL}/api/reservations/${reservationId}/credit-adjustment`;
    const headers = await getAuthHeaders();
    const body = {
      pool_id: input.poolId,
      passenger_user_id: input.passengerUserId,
      final_trip_price: input.finalTripPrice,
      credit_granted: input.creditGranted,
      credit_balance_after: input.creditBalanceAfter,
      reason: input.reason,
      processed_at: input.processedAt,
    };

    console.info(`riderClient.notifyCreditAdjustment: Sending PATCH to ${url}`, body);

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`riderClient.notifyCreditAdjustment failed: [${response.status}] ${errorText}`);
      throw new Error(`Rider App credit adjustment notification failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      reservation_id: data.reservation_id || reservationId,
      pool_id: data.pool_id,
      passenger_user_id: data.passenger_user_id,
      final_trip_price: Number(data.final_trip_price),
      credit_granted: Number(data.credit_granted),
      credit_balance_after: Number(data.credit_balance_after),
      reason: data.reason,
      processed_at: data.processed_at || data.processedAt || new Date().toISOString(),
    };
  },
};
