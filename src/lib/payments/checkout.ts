import { Prisma } from "@prisma/client";
import { notifyReservationPaymentResult } from "@/lib/external-apis";
import { processCheckoutPayment } from "@/lib/payments/provider";
import { prisma } from "@/lib/prisma";

type CreateCheckoutInput = {
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  maxPrice: number;
  currency: string;
  successUrl: string;
  failureUrl: string;
  paymentToken?: string;
  paymentMethodId?: string;
  payerEmail?: string;
  mockPaymentStatus?: "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
  expiresAt?: string;
};

type CheckoutResponseData = {
  checkoutId: string;
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  paymentUrl: string | null;
  maxPrice: number;
  availableCredit: number;
  creditApplied: number;
  amountToCharge: number;
  currency: string;
  checkoutStatus: "CREATED" | "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
};

type CreateCheckoutResult =
  | { ok: true; status: number; data: CheckoutResponseData }
  | { ok: false; status: number; error: string; message: string };

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value ? value.toNumber() : 0;
}

function createPaymentUrl(input: {
  reservationId: string;
  successUrl: string;
  failureUrl: string;
}) {
  const search = new URLSearchParams({
    reservation_id: input.reservationId,
    success_url: input.successUrl,
    failure_url: input.failureUrl,
  });

  return `https://sandbox.mercadopago.com/checkout/mock?${search.toString()}`;
}

async function ensureCreditAccount(userId: string, currency: string) {
  const existing = await prisma.creditAccount.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.creditAccount.create({
    data: {
      userId,
      balance: toDecimal(0),
      currency,
    },
  });
}

async function finalizeSuccessfulCheckout(input: {
  checkoutId: string;
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  maxPrice: number;
  creditApplied: number;
  amountCharged: number;
  currency: string;
  transactionId: string;
  processedAt: Date;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.checkoutSession.update({
      where: { id: input.checkoutId },
      data: { status: "PAID" },
    });

    await tx.charge.create({
      data: {
        transactionId: input.transactionId,
        checkoutSessionId: input.checkoutId,
        poolId: input.poolId,
        reservationId: input.reservationId,
        passengerUserId: input.passengerUserId,
        maxPrice: toDecimal(input.maxPrice),
        creditApplied: toDecimal(input.creditApplied),
        amountCharged: toDecimal(input.amountCharged),
        finalTripPrice: null,
        creditGranted: toDecimal(0),
        currency: input.currency,
        status: "PAID",
        provider: "MERCADO_PAGO",
        processedAt: input.processedAt,
      },
    });

    if (input.creditApplied > 0) {
      const creditAccount = await tx.creditAccount.findUnique({
        where: { userId: input.passengerUserId },
      });

      if (!creditAccount) {
        throw new Error("CREDIT_ACCOUNT_NOT_FOUND");
      }

      await tx.creditAccount.update({
        where: { id: creditAccount.id },
        data: {
          balance: {
            decrement: toDecimal(input.creditApplied),
          },
        },
      });

      const createdCharge = await tx.charge.findUniqueOrThrow({
        where: { transactionId: input.transactionId },
        select: { id: true },
      });

      await tx.creditMovement.create({
        data: {
          creditAccountId: creditAccount.id,
          userId: input.passengerUserId,
          type: "CREDIT_APPLIED",
          amount: toDecimal(input.creditApplied),
          currency: input.currency,
          reservationId: input.reservationId,
          poolId: input.poolId,
          chargeId: createdCharge.id,
          description: "Saldo a favor aplicado en checkout.",
        },
      });
    }
  });

  await notifyReservationPaymentResult({
    reservationId: input.reservationId,
    paymentStatus: "PAID",
    transactionId: input.transactionId,
    maxPrice: input.maxPrice,
    creditApplied: input.creditApplied,
    amountCharged: input.amountCharged,
    currency: input.currency,
    processedAt: input.processedAt.toISOString(),
  });
}

async function finalizeNonSuccessfulCheckout(input: {
  checkoutId: string;
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  maxPrice: number;
  currency: string;
  transactionId: string;
  processedAt: Date;
  status: "DENIED" | "CANCELED" | "EXPIRED";
  rejectionReason?: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.checkoutSession.update({
      where: { id: input.checkoutId },
      data: { status: input.status },
    });

    if (input.status === "DENIED") {
      await tx.charge.create({
        data: {
          transactionId: input.transactionId,
          checkoutSessionId: input.checkoutId,
          poolId: input.poolId,
          reservationId: input.reservationId,
          passengerUserId: input.passengerUserId,
          maxPrice: toDecimal(input.maxPrice),
          creditApplied: toDecimal(0),
          amountCharged: toDecimal(0),
          finalTripPrice: null,
          creditGranted: toDecimal(0),
          currency: input.currency,
          status: "DENIED",
          provider: "MERCADO_PAGO",
          rejectionReason: input.rejectionReason ?? "PAYMENT_REJECTED",
          processedAt: input.processedAt,
        },
      });
    }
  });

  await notifyReservationPaymentResult({
    reservationId: input.reservationId,
    paymentStatus: input.status,
    transactionId: input.transactionId,
    currency: input.currency,
    rejectionReason: input.rejectionReason,
    processedAt: input.processedAt.toISOString(),
  });
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const existingSession = await prisma.checkoutSession.findFirst({
    where: {
      reservationId: input.reservationId,
      status: {
        in: ["CREATED", "PENDING", "PAID"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingSession) {
    return {
      ok: false,
      status: 409,
      error: "CHECKOUT_ALREADY_EXISTS",
      message: "Ya existe un checkout activo o pagado para esta reserva.",
    };
  }

  const creditAccount = await ensureCreditAccount(input.passengerUserId, input.currency);
  const availableCredit = decimalToNumber(creditAccount.balance);
  const creditApplied = Math.min(availableCredit, input.maxPrice);
  const amountToCharge = Math.max(input.maxPrice - creditApplied, 0);
  const paymentUrl = amountToCharge > 0
    ? createPaymentUrl({
        reservationId: input.reservationId,
        successUrl: input.successUrl,
        failureUrl: input.failureUrl,
      })
    : null;

  const checkoutSession = await prisma.checkoutSession.create({
    data: {
      reservationId: input.reservationId,
      poolId: input.poolId,
      passengerUserId: input.passengerUserId,
      maxPrice: toDecimal(input.maxPrice),
      availableCreditAtCreation: creditAccount.balance,
      creditApplied: toDecimal(creditApplied),
      amountToCharge: toDecimal(amountToCharge),
      currency: input.currency,
      status: amountToCharge === 0 && !input.mockPaymentStatus ? "PAID" : "CREATED",
      provider: "MERCADO_PAGO",
      paymentUrl,
      providerCheckoutReference: `chk_${crypto.randomUUID()}`,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  let checkoutStatus: CheckoutResponseData["checkoutStatus"] = checkoutSession.status;

  if (amountToCharge === 0 && !input.mockPaymentStatus) {
    const transactionId = `credit_only_${crypto.randomUUID()}`;
    const processedAt = new Date();

    await finalizeSuccessfulCheckout({
      checkoutId: checkoutSession.id,
      reservationId: input.reservationId,
      poolId: input.poolId,
      passengerUserId: input.passengerUserId,
      maxPrice: input.maxPrice,
      creditApplied,
      amountCharged: 0,
      currency: input.currency,
      transactionId,
      processedAt,
    });

    checkoutStatus = "PAID";
  } else if (input.mockPaymentStatus) {
    const paymentResult = await processCheckoutPayment({
      amount: amountToCharge,
      currency: input.currency,
      passengerUserId: input.passengerUserId,
      paymentToken: input.paymentToken,
      paymentMethodId: input.paymentMethodId,
      payerEmail: input.payerEmail,
      mockOutcome: input.mockPaymentStatus,
    });

    checkoutStatus = paymentResult.status;

    if (paymentResult.status === "PAID") {
      await finalizeSuccessfulCheckout({
        checkoutId: checkoutSession.id,
        reservationId: input.reservationId,
        poolId: input.poolId,
        passengerUserId: input.passengerUserId,
        maxPrice: input.maxPrice,
        creditApplied,
        amountCharged: paymentResult.amountCharged,
        currency: paymentResult.currency,
        transactionId: paymentResult.transactionId,
        processedAt: paymentResult.processedAt,
      });
    } else {
      await finalizeNonSuccessfulCheckout({
        checkoutId: checkoutSession.id,
        reservationId: input.reservationId,
        poolId: input.poolId,
        passengerUserId: input.passengerUserId,
        maxPrice: input.maxPrice,
        currency: paymentResult.currency,
        transactionId: paymentResult.transactionId,
        processedAt: paymentResult.processedAt,
        status: paymentResult.status,
        rejectionReason:
          paymentResult.status === "DENIED" ? paymentResult.rejectionReason : undefined,
      });
    }
  }

  return {
    ok: true,
    status: 201,
    data: {
      checkoutId: checkoutSession.id,
      reservationId: input.reservationId,
      poolId: input.poolId,
      passengerUserId: input.passengerUserId,
      paymentUrl,
      maxPrice: input.maxPrice,
      availableCredit,
      creditApplied,
      amountToCharge,
      currency: input.currency,
      checkoutStatus,
    },
  };
}
