import type { PaymentMethod } from "@prisma/client";

type SimulatedChargeInput = {
  paymentMethod: PaymentMethod | null;
  amount: number;
  currency: string;
};

type SimulatedPaidCharge = {
  status: "PAID";
  transactionId: string;
  effectivePrice: number;
  currency: string;
  processedAt: Date;
};

type SimulatedDeniedCharge = {
  status: "DENIED";
  transactionId: string;
  rejectionReason: string;
  currency: string;
  processedAt: Date;
};

export type SimulatedChargeResult = SimulatedPaidCharge | SimulatedDeniedCharge;

export async function simulatePaymentCharge(input: SimulatedChargeInput): Promise<SimulatedChargeResult> {
  const processedAt = new Date();
  const transactionId = `txn_${crypto.randomUUID()}`;

  if (!input.paymentMethod) {
    return {
      status: "DENIED",
      transactionId,
      rejectionReason: "PAYMENT_METHOD_NOT_FOUND",
      currency: input.currency,
      processedAt,
    };
  }

  if (input.paymentMethod.holderName.toUpperCase() === "FUND") {
    return {
      status: "DENIED",
      transactionId,
      rejectionReason: "INSUFFICIENT_FUNDS",
      currency: input.currency,
      processedAt,
    };
  }

  return {
    status: "PAID",
    transactionId,
    effectivePrice: input.amount,
    currency: input.currency,
    processedAt,
  };
}
