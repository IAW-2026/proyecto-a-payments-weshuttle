import { payment } from "./mercadopago";

type SimulatedPaidCharge = {
  status: "PAID";
  transactionId: string;
  amountCharged: number;
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

type SimulatedCanceledCheckout = {
  status: "CANCELED";
  transactionId: string;
  currency: string;
  processedAt: Date;
};

type SimulatedExpiredCheckout = {
  status: "EXPIRED";
  transactionId: string;
  currency: string;
  processedAt: Date;
};

export type CheckoutPaymentResult =
  | SimulatedPaidCharge
  | SimulatedDeniedCharge
  | SimulatedCanceledCheckout
  | SimulatedExpiredCheckout;

export type ProcessCheckoutPaymentInput = {
  amount: number;
  currency: string;
  passengerUserId: string;
  paymentToken?: string;
  paymentMethodId?: string;
  payerEmail?: string;
  mockOutcome?: "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
};

function buildTransactionId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function processCheckoutPayment(
  input: ProcessCheckoutPaymentInput,
): Promise<CheckoutPaymentResult> {
  const processedAt = new Date();

  if (input.amount <= 0) {
    return {
      status: "PAID",
      transactionId: buildTransactionId("credit_only"),
      amountCharged: 0,
      currency: input.currency,
      processedAt,
    };
  }

  if (input.mockOutcome === "CANCELED") {
    return {
      status: "CANCELED",
      transactionId: buildTransactionId("canceled"),
      currency: input.currency,
      processedAt,
    };
  }

  if (input.mockOutcome === "EXPIRED") {
    return {
      status: "EXPIRED",
      transactionId: buildTransactionId("expired"),
      currency: input.currency,
      processedAt,
    };
  }

  if (input.mockOutcome === "DENIED") {
    return {
      status: "DENIED",
      transactionId: buildTransactionId("denied"),
      rejectionReason: "INSUFFICIENT_FUNDS",
      currency: input.currency,
      processedAt,
    };
  }

  if (!input.paymentToken && input.mockOutcome !== "PAID") {
    return {
      status: "DENIED",
      transactionId: buildTransactionId("denied"),
      rejectionReason: "PAYMENT_TOKEN_NOT_PROVIDED",
      currency: input.currency,
      processedAt,
    };
  }

  if (input.mockOutcome === "PAID") {
    return {
      status: "PAID",
      transactionId: buildTransactionId("sandbox"),
      amountCharged: input.amount,
      currency: input.currency,
      processedAt,
    };
  }

  try {
    const mpResponse = await payment.create({
      body: {
        transaction_amount: input.amount,
        token: input.paymentToken,
        description: `WeShuttle Checkout - ${input.passengerUserId}`,
        installments: 1,
        payment_method_id: input.paymentMethodId ?? "visa",
        payer: {
          email: input.payerEmail ?? `${input.passengerUserId}@mock-iaw.com`,
        },
      },
    });

    if (mpResponse.status === "approved") {
      return {
        status: "PAID",
        transactionId: mpResponse.id?.toString() || buildTransactionId("mp"),
        amountCharged: mpResponse.transaction_amount || input.amount,
        currency: mpResponse.currency_id || input.currency,
        processedAt: mpResponse.date_approved ? new Date(mpResponse.date_approved) : processedAt,
      };
    }

    return {
      status: "DENIED",
      transactionId: mpResponse.id?.toString() || buildTransactionId("mp_failed"),
      rejectionReason: mpResponse.status_detail || "PAYMENT_REJECTED",
      currency: input.currency,
      processedAt,
    };
  } catch (error: any) {
    console.error("Mercado Pago Error:", error);

    return {
      status: "DENIED",
      transactionId: buildTransactionId("gateway_error"),
      rejectionReason: error.message || "GATEWAY_ERROR",
      currency: input.currency,
      processedAt,
    };
  }
}
