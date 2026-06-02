import type {
  ExternalPaymentResultInput,
  ExternalPaymentResultResponse,
  ExternalPoolPassengersResponse,
} from "@/lib/external-apis/types";

const MOCK_MANIFESTS: Record<string, ExternalPoolPassengersResponse> = {
  pool_charge_ready_01: {
    poolId: "pool_charge_ready_01",
    passengers: [
      {
        reservationId: "res_auto_100001",
        passengerUserId: "user_rider_apro_01",
        passengerName: "Rider Aprobado",
        reservationStatus: "CONFIRMED",
        pickupPoint: {
          address: "Av. Alem 1250, Bahia Blanca",
          lat: -38.718,
          lng: -62.266,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-10T08:00:00Z",
        maxPrice: 0,
        effectivePrice: null,
      },
      {
        reservationId: "res_auto_100002",
        passengerUserId: "user_rider_fund_01",
        passengerName: "Rider Fondos Insuficientes",
        reservationStatus: "CONFIRMED",
        pickupPoint: {
          address: "Sarmiento 850, Bahia Blanca",
          lat: -38.713,
          lng: -62.261,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-10T08:00:00Z",
        maxPrice: 0,
        effectivePrice: null,
      },
      {
        reservationId: "res_auto_100003",
        passengerUserId: "user_rider_cont_01",
        passengerName: "Rider Continuidad",
        reservationStatus: "CONFIRMED",
        pickupPoint: {
          address: "Brown 510, Bahia Blanca",
          lat: -38.7214,
          lng: -62.2721,
        },
        destinationId: "dest_polo_petroquimico",
        departureTime: "2026-06-10T08:00:00Z",
        maxPrice: 0,
        effectivePrice: null,
      },
    ],
  },
  pool_settle_ready_01: {
    poolId: "pool_settle_ready_01",
    passengers: [
      {
        reservationId: "res_auto_200001",
        passengerUserId: "user_rider_apro_01",
        passengerName: "Rider Aprobado",
        reservationStatus: "CONFIRMED",
        pickupPoint: {
          address: "Rondeau 120, Bahia Blanca",
          lat: -38.7145,
          lng: -62.2694,
        },
        destinationId: "dest_puerto_ingeniero_white",
        departureTime: "2026-06-11T08:00:00Z",
        maxPrice: 0,
        effectivePrice: null,
      },
      {
        reservationId: "res_auto_200002",
        passengerUserId: "user_rider_cont_01",
        passengerName: "Rider Continuidad",
        reservationStatus: "CONFIRMED",
        pickupPoint: {
          address: "11 de Abril 430, Bahia Blanca",
          lat: -38.7172,
          lng: -62.2762,
        },
        destinationId: "dest_puerto_ingeniero_white",
        departureTime: "2026-06-11T08:00:00Z",
        maxPrice: 0,
        effectivePrice: null,
      },
    ],
  },
};

export async function getPoolPassengers(poolId: string, options?: { status?: string }) {
  const manifest = MOCK_MANIFESTS[poolId];

  if (!manifest) {
    return null;
  }

  const passengers = options?.status
    ? manifest.passengers.filter(
        (passenger) => passenger.reservationStatus === options.status,
      )
    : manifest.passengers;

  return {
    poolId: manifest.poolId,
    passengers,
  };
}

export async function notifyReservationPaymentResult(
  input: ExternalPaymentResultInput,
): Promise<ExternalPaymentResultResponse> {
  if (input.paymentStatus === "PAID") {
    return {
      reservation_id: input.reservationId,
      reservation_status: "PAID",
      effective_price: input.effectivePrice ?? null,
    };
  }

  return {
    reservation_id: input.reservationId,
    reservation_status: "DENIED",
    effective_price: null,
  };
}
