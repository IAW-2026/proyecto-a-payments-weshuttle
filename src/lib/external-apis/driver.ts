import { getPoolPassengers } from "@/lib/external-apis/rider";
import type {
  ExternalPaymentDeniedInput,
  ExternalPaymentDeniedResponse,
} from "@/lib/external-apis/types";

export async function notifyPoolPaymentDenied(
  input: ExternalPaymentDeniedInput,
): Promise<ExternalPaymentDeniedResponse> {
  const manifest = await getPoolPassengers(input.poolId);
  const currentPassengers = Math.max((manifest?.passengers.length ?? 1) - 1, 0);

  return {
    pool_id: input.poolId,
    reservation_id: input.reservationId,
    passenger_user_id: input.passengerUserId,
    current_passengers: currentPassengers,
    pool_status: currentPassengers === 0 ? "CANCELED" : "LOCKED",
  };
}
