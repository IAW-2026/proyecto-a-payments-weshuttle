export type ExternalReservationStatus =
  | "PENDING_PAYMENT"
  | "PENDING_DRIVER"
  | "CONFIRMED"
  | "CANCELED";

export type ExternalPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "DENIED"
  | "CANCELED"
  | "EXPIRED";

export type ExternalPoolPassenger = {
  reservationId: string;
  passengerUserId: string;
  passengerName: string;
  reservationStatus: ExternalReservationStatus;
  paymentStatus: ExternalPaymentStatus;
  pickupPoint: {
    address: string;
    lat: number;
    lng: number;
  };
  destinationId: string;
  departureTime: string;
  maxPrice: number;
  amountCharged: number;
  creditApplied: number;
  finalTripPrice: number | null;
  creditGranted: number;
  currency: string;
};

export type ExternalPoolPassengersResponse = {
  poolId: string;
  passengers: ExternalPoolPassenger[];
};

export type ExternalPoolPassengersFilter = {
  reservationStatus?: ExternalReservationStatus;
  paymentStatus?: ExternalPaymentStatus;
};

export type ExternalPaymentResultInput = {
  reservationId: string;
  paymentStatus: "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
  transactionId: string;
  maxPrice?: number;
  creditApplied?: number;
  amountCharged?: number;
  currency: string;
  rejectionReason?: string;
  processedAt: string;
};

export type ExternalPaymentResultResponse = {
  reservation_id: string;
  payment_status: "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
  reservation_status: ExternalReservationStatus;
  max_price?: number;
  credit_applied?: number;
  amount_charged?: number;
};

export type ExternalCreditAdjustmentInput = {
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  finalTripPrice: number;
  creditGranted: number;
  creditBalanceAfter: number;
  reason: "POOL_LOCKED" | "NO_DRIVER_ASSIGNED";
  processedAt: string;
};

export type ExternalCreditAdjustmentResponse = {
  reservation_id: string;
  pool_id: string;
  passenger_user_id: string;
  final_trip_price: number;
  credit_granted: number;
  credit_balance_after: number;
  reason: "POOL_LOCKED" | "NO_DRIVER_ASSIGNED";
  processed_at: string;
};
