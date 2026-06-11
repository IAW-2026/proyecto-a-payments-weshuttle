import type {
  ExternalCreditAdjustmentInput,
  ExternalCreditAdjustmentResponse,
  ExternalPaymentResultInput,
  ExternalPaymentResultResponse,
  ExternalPoolPassengersFilter,
  ExternalPoolPassengersResponse,
} from "@/lib/external-apis/types";

const MOCK_MANIFESTS: Record<string, ExternalPoolPassengersResponse> = {
  pool_demo_checkout_01: {
    poolId: "pool_demo_checkout_01",
    passengers: [
      {
        reservationId: "res_paid_001",
        passengerUserId: "rider+clerk_test@iaw.com",
        passengerName: "Rider Uno",
        reservationStatus: "PENDING_DRIVER",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Av. Alem 1250, Bahia Blanca",
          lat: -38.718,
          lng: -62.266,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-10T08:00:00Z",
        maxPrice: 5800,
        amountCharged: 5800,
        creditApplied: 0,
        finalTripPrice: null,
        creditGranted: 0,
        currency: "ARS",
      },
      {
        reservationId: "res_paid_credit_001",
        passengerUserId: "rider_credit+clerk_test@iaw.com",
        passengerName: "Rider Credito",
        reservationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Sarmiento 850, Bahia Blanca",
          lat: -38.713,
          lng: -62.261,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-10T08:00:00Z",
        maxPrice: 5800,
        amountCharged: 4600,
        creditApplied: 1200,
        finalTripPrice: null,
        creditGranted: 0,
        currency: "ARS",
      },
    ],
  },
  pool_demo_checkout_02: {
    poolId: "pool_demo_checkout_02",
    passengers: [
      {
        reservationId: "res_paid_full_credit_001",
        passengerUserId: "rider_credit+clerk_test@iaw.com",
        passengerName: "Rider Credito",
        reservationStatus: "PENDING_DRIVER",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Brown 510, Bahia Blanca",
          lat: -38.7214,
          lng: -62.2721,
        },
        destinationId: "dest_parque_industrial",
        departureTime: "2026-06-11T08:00:00Z",
        maxPrice: 2500,
        amountCharged: 0,
        creditApplied: 2500,
        finalTripPrice: null,
        creditGranted: 0,
        currency: "ARS",
      },
      {
        reservationId: "res_denied_001",
        passengerUserId: "rider_denied+clerk_test@iaw.com",
        passengerName: "Rider Denegado",
        reservationStatus: "PENDING_PAYMENT",
        paymentStatus: "DENIED",
        pickupPoint: {
          address: "11 de Abril 430, Bahia Blanca",
          lat: -38.7172,
          lng: -62.2762,
        },
        destinationId: "dest_puerto_ingeniero_white",
        departureTime: "2026-06-11T08:00:00Z",
        maxPrice: 4800,
        amountCharged: 0,
        creditApplied: 0,
        finalTripPrice: null,
        creditGranted: 0,
        currency: "ARS",
      },
    ],
  },
  pool_demo_locked_01: {
    poolId: "pool_demo_locked_01",
    passengers: [
      {
        reservationId: "res_locked_credit_001",
        passengerUserId: "rider+clerk_test@iaw.com",
        passengerName: "Rider Uno",
        reservationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Av. Alem 1250, Bahia Blanca",
          lat: -38.718,
          lng: -62.266,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-09T08:00:00Z",
        maxPrice: 5800,
        amountCharged: 5800,
        creditApplied: 0,
        finalTripPrice: 4756,
        creditGranted: 1044,
        currency: "ARS",
      },
      {
        reservationId: "res_locked_credit_002",
        passengerUserId: "rider2+clerk_test@iaw.com",
        passengerName: "Rider Dos",
        reservationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Sarmiento 850, Bahia Blanca",
          lat: -38.713,
          lng: -62.261,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-09T08:00:00Z",
        maxPrice: 5800,
        amountCharged: 5800,
        creditApplied: 0,
        finalTripPrice: 4756,
        creditGranted: 1044,
        currency: "ARS",
      },
    ],
  },
  pool_demo_no_driver_01: {
    poolId: "pool_demo_no_driver_01",
    passengers: [
      {
        reservationId: "res_no_driver_001",
        passengerUserId: "rider2+clerk_test@iaw.com",
        passengerName: "Rider Dos",
        reservationStatus: "CANCELED",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Rondeau 120, Bahia Blanca",
          lat: -38.7145,
          lng: -62.2694,
        },
        destinationId: "dest_puerto_ingeniero_white",
        departureTime: "2026-06-08T08:00:00Z",
        maxPrice: 5000,
        amountCharged: 5000,
        creditApplied: 0,
        finalTripPrice: 0,
        creditGranted: 5000,
        currency: "ARS",
      },
    ],
  },
  pool_demo_settlement_01: {
    poolId: "pool_demo_settlement_01",
    passengers: [
      {
        reservationId: "res_settlement_pending_001",
        passengerUserId: "rider+clerk_test@iaw.com",
        passengerName: "Rider Uno",
        reservationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        pickupPoint: {
          address: "Vieytes 245, Bahia Blanca",
          lat: -38.7164,
          lng: -62.2712,
        },
        destinationId: "dest_parque_industrial",
        departureTime: "2026-06-12T08:00:00Z",
        maxPrice: 6500,
        amountCharged: 6500,
        creditApplied: 0,
        finalTripPrice: 5850,
        creditGranted: 650,
        currency: "ARS",
      },
    ],
  },
};

function matchesFilter(
  manifest: ExternalPoolPassengersResponse,
  filter?: ExternalPoolPassengersFilter,
) {
  if (!filter) {
    return manifest.passengers;
  }

  return manifest.passengers.filter((passenger) => {
    if (filter.reservationStatus && passenger.reservationStatus !== filter.reservationStatus) {
      return false;
    }

    if (filter.paymentStatus && passenger.paymentStatus !== filter.paymentStatus) {
      return false;
    }

    return true;
  });
}

export async function getPoolPassengers(
  poolId: string,
  filter?: ExternalPoolPassengersFilter,
) {
  const manifest = MOCK_MANIFESTS[poolId];

  if (!manifest) {
    return null;
  }

  return {
    poolId: manifest.poolId,
    passengers: matchesFilter(manifest, filter),
  };
}

export async function notifyReservationPaymentResult(
  input: ExternalPaymentResultInput,
): Promise<ExternalPaymentResultResponse> {
  if (input.paymentStatus === "PAID") {
    return {
      reservation_id: input.reservationId,
      payment_status: "PAID",
      reservation_status: "PENDING_DRIVER",
      max_price: input.maxPrice,
      credit_applied: input.creditApplied,
      amount_charged: input.amountCharged,
    };
  }

  if (input.paymentStatus === "DENIED") {
    return {
      reservation_id: input.reservationId,
      payment_status: "DENIED",
      reservation_status: "PENDING_PAYMENT",
    };
  }

  return {
    reservation_id: input.reservationId,
    payment_status: input.paymentStatus,
    reservation_status: "CANCELED",
  };
}

export async function notifyReservationCreditAdjustment(
  input: ExternalCreditAdjustmentInput,
): Promise<ExternalCreditAdjustmentResponse> {
  return {
    reservation_id: input.reservationId,
    pool_id: input.poolId,
    passenger_user_id: input.passengerUserId,
    final_trip_price: input.finalTripPrice,
    credit_granted: input.creditGranted,
    credit_balance_after: input.creditBalanceAfter,
    reason: input.reason,
    processed_at: input.processedAt,
  };
}
