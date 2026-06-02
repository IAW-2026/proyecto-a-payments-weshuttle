export type ExternalPoolPassenger = {
  reservationId: string;
  passengerUserId: string;
  passengerName: string;
  reservationStatus: "CONFIRMED" | "PAID" | "DENIED";
  pickupPoint: {
    address: string;
    lat: number;
    lng: number;
  };
  destinationId: string;
  departureTime: string;
  maxPrice: number;
  effectivePrice: number | null;
};

export type ExternalPoolPassengersResponse = {
  poolId: string;
  passengers: ExternalPoolPassenger[];
};

export type ExternalPaymentResultInput = {
  reservationId: string;
  paymentStatus: "PAID" | "DENIED";
  transactionId: string;
  effectivePrice?: number;
  currency: string;
  rejectionReason?: string;
  discountsApplied?: Array<{
    type: string;
    amount: number;
  }>;
  processedAt: string;
};

export type ExternalPaymentResultResponse = {
  reservation_id: string;
  reservation_status: "PAID" | "DENIED";
  effective_price: number | null;
};

export type ExternalPaymentDeniedInput = {
  poolId: string;
  reservationId: string;
  passengerUserId: string;
  reason?: "PAYMENT_REJECTED";
};

export type ExternalPaymentDeniedResponse = {
  pool_id: string;
  reservation_id: string;
  passenger_user_id: string;
  current_passengers: number;
  pool_status: "LOCKED" | "CANCELED";
};
