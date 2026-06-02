import { getMockPoolPassengers } from "@/lib/mock/rider-api";

type PaymentDeniedInput = {
  poolId: string;
  reservationId: string;
  passengerUserId: string;
};

export async function notifyMockPoolPaymentDenied(input: PaymentDeniedInput) {
  const manifest = await getMockPoolPassengers(input.poolId);
  const currentPassengers = Math.max((manifest?.passengers.length ?? 1) - 1, 0);

  return {
    pool_id: input.poolId,
    reservation_id: input.reservationId,
    passenger_user_id: input.passengerUserId,
    current_passengers: currentPassengers,
    pool_status: currentPassengers === 0 ? "CANCELED" : "LOCKED",
  };
}
