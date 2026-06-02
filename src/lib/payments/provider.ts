import type { PaymentMethod } from "@prisma/client";
import { payment } from "./mercadopago";

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

/**
 * Processes a payment charge using Mercado Pago SDK in Sandbox mode.
 * In a real scenario, this would use the card token stored in providerToken.
 */
export async function simulatePaymentCharge(input: SimulatedChargeInput): Promise<SimulatedChargeResult> {
  const processedAt = new Date();

  if (!input.paymentMethod) {
    return {
      status: "DENIED",
      transactionId: `failed_${crypto.randomUUID()}`,
      rejectionReason: "PAYMENT_METHOD_NOT_FOUND",
      currency: input.currency,
      processedAt,
    };
  }

  try {
    // Mercado Pago Payment Creation
    // In Sandbox, we use the providerToken which should be a test card token.
    const mpResponse = await payment.create({
      body: {
        transaction_amount: input.amount,
        token: input.paymentMethod.providerToken,
        description: `WeShuttle Ride Charge - ${input.paymentMethod.clerkUserId}`,
        installments: 1,
        payment_method_id: input.paymentMethod.cardBrand.toLowerCase(), // e.g., 'visa', 'master'
        payer: {
          email: `${input.paymentMethod.clerkUserId}@mock-iaw.com`, // Simulated email from Clerk ID
        },
      },
    });

    if (mpResponse.status === "approved") {
      return {
        status: "PAID",
        transactionId: mpResponse.id?.toString() || `mp_${crypto.randomUUID()}`,
        effectivePrice: mpResponse.transaction_amount || input.amount,
        currency: mpResponse.currency_id || input.currency,
        processedAt: mpResponse.date_approved ? new Date(mpResponse.date_approved) : processedAt,
      };
    } else {
      return {
        status: "DENIED",
        transactionId: mpResponse.id?.toString() || `mp_failed_${crypto.randomUUID()}`,
        rejectionReason: mpResponse.status_detail || "PAYMENT_REJECTED",
        currency: input.currency,
        processedAt,
      };
    }
  } catch (error: any) {
    console.error("Mercado Pago Error:", error);
    
    // Handle specific MP error scenarios if needed
    return {
      status: "DENIED",
      transactionId: `error_${crypto.randomUUID()}`,
      rejectionReason: error.message || "GATEWAY_ERROR",
      currency: input.currency,
      processedAt,
    };
  }
}
