import { Prisma } from "@prisma/client";
import { notifyReservationPaymentResult } from "@/lib/external-apis";
import {
  getPaymentClient,
  getPreferenceClient,
  isMercadoPagoConfigured,
} from "@/lib/payments/mercadopago";
import { prisma } from "@/lib/prisma";

type CreateCheckoutInput = {
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  maxPrice: number;
  currency: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  appBaseUrl: string;
  expiresAt?: string;
};

type CheckoutStatus = "CREATED" | "PENDING" | "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
type ChargeStatus = "PENDING" | "PAID" | "DENIED" | "CANCELED";
type DemoCheckoutStatus = "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
type ReturnRouteKind = "success" | "failure" | "pending";

type CheckoutResponseData = {
  checkoutId: string;
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  checkoutUrl: string | null;
  maxPrice: number;
  availableCredit: number;
  creditApplied: number;
  amountToCharge: number;
  currency: string;
  checkoutStatus: CheckoutStatus;
  isDemoMode: boolean;
};

type CreateCheckoutResult =
  | { ok: true; status: number; data: CheckoutResponseData }
  | { ok: false; status: number; error: string; message: string };

type CheckoutSummary = {
  id: string;
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  maxPrice: number;
  availableCreditAtCreation: number;
  creditApplied: number;
  amountToCharge: number;
  currency: string;
  status: CheckoutStatus;
  checkoutUrl: string | null;
  mercadoPagoPreferenceId: string | null;
  mercadoPagoInitPoint: string | null;
  expiresAt: string | null;
};

type CheckoutPageData = {
  checkout: CheckoutSummary;
  isDemoMode: boolean;
};

type ReconcileCheckoutReturnInput = {
  checkoutId: string;
  routeKind: ReturnRouteKind;
  paymentId?: string;
  status?: string;
  collectionStatus?: string;
  externalReference?: string;
  merchantOrderId?: string;
  preferenceId?: string;
  paymentType?: string;
  processingMode?: string;
};

type ReconcileCheckoutReturnResult =
  | { ok: true; data: CheckoutPageData }
  | { ok: false; error: string; message: string; data?: CheckoutPageData };

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value ? value.toNumber() : 0;
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildCheckoutUrl(appBaseUrl: string, checkoutId: string) {
  return `${normalizeBaseUrl(appBaseUrl)}/checkout/${checkoutId}`;
}

function buildCheckoutBackUrl(input: {
  appBaseUrl: string;
  checkoutId: string;
  kind: ReturnRouteKind;
}) {
  const url = new URL(buildCheckoutUrl(input.appBaseUrl, input.checkoutId));
  url.pathname = `${url.pathname}/${input.kind}`;

  return url.toString();
}

function buildDemoTransactionId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function buildProcessedAt(dateValue?: string) {
  if (!dateValue) {
    return new Date();
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeMercadoPagoQueryParam(value?: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const lowerCasedValue = normalizedValue.toLowerCase();

  if (lowerCasedValue === "null" || lowerCasedValue === "undefined") {
    return undefined;
  }

  return normalizedValue;
}

function truncateForLog(value: string, max = 500) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function stringifyForLog(value: unknown) {
  try {
    return truncateForLog(JSON.stringify(value));
  } catch {
    return truncateForLog(String(value));
  }
}

function toLogRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function summarizeMercadoPagoError(error: unknown) {
  if (error instanceof Error) {
    const errorRecord = toLogRecord(error);
    const status = typeof errorRecord?.status === "number"
      ? errorRecord.status
      : typeof toLogRecord(errorRecord?.api_response)?.status === "number"
        ? toLogRecord(errorRecord?.api_response)?.status as number
        : null;
    const body = error.cause !== undefined
      ? { cause: error.cause }
      : errorRecord
        ? {
            error: errorRecord.error,
            cause: errorRecord.cause,
            status: errorRecord.status,
            statusText: errorRecord.statusText,
          }
        : null;

    return {
      message: error.message,
      status,
      bodySummary: body ? stringifyForLog(body) : null,
    };
  }

  const errorRecord = toLogRecord(error);
  const status = typeof errorRecord?.status === "number"
    ? errorRecord.status
    : typeof toLogRecord(errorRecord?.api_response)?.status === "number"
      ? toLogRecord(errorRecord?.api_response)?.status as number
      : null;
  const message = typeof errorRecord?.message === "string"
    ? errorRecord.message
    : typeof errorRecord?.error === "string"
      ? errorRecord.error
      : "Unknown Mercado Pago error";
  const body = errorRecord
    ? {
        error: errorRecord.error,
        cause: errorRecord.cause,
        status: errorRecord.status,
        statusText: errorRecord.statusText,
        message: errorRecord.message,
      }
    : { value: error };

  return {
    message,
    status,
    bodySummary: stringifyForLog(body),
  };
}

function getDefaultStatusForRoute(routeKind: ReturnRouteKind): CheckoutStatus {
  if (routeKind === "success") {
    return "PAID";
  }

  if (routeKind === "pending") {
    return "PENDING";
  }

  return "CANCELED";
}

function mapMercadoPagoStatus(rawStatus: string | undefined, routeKind: ReturnRouteKind): CheckoutStatus {
  switch (rawStatus) {
    case "approved":
      return "PAID";
    case "pending":
    case "in_process":
      return "PENDING";
    case "rejected":
      return "DENIED";
    case "cancelled":
      return "CANCELED";
    default:
      return getDefaultStatusForRoute(routeKind);
  }
}

function shouldNotifyRider(status: CheckoutStatus) {
  return status === "PAID" || status === "DENIED" || status === "CANCELED" || status === "EXPIRED";
}

function buildCheckoutSummary(
  checkout: {
    id: string;
    reservationId: string;
    poolId: string;
    passengerUserId: string;
    maxPrice: Prisma.Decimal;
    availableCreditAtCreation: Prisma.Decimal;
    creditApplied: Prisma.Decimal;
    amountToCharge: Prisma.Decimal;
    currency: string;
    status: CheckoutStatus;
    checkoutUrl: string | null;
    mercadoPagoPreferenceId: string | null;
    mercadoPagoInitPoint: string | null;
    expiresAt: Date | null;
  },
): CheckoutSummary {
  return {
    id: checkout.id,
    reservationId: checkout.reservationId,
    poolId: checkout.poolId,
    passengerUserId: checkout.passengerUserId,
    maxPrice: decimalToNumber(checkout.maxPrice),
    availableCreditAtCreation: decimalToNumber(checkout.availableCreditAtCreation),
    creditApplied: decimalToNumber(checkout.creditApplied),
    amountToCharge: decimalToNumber(checkout.amountToCharge),
    currency: checkout.currency,
    status: checkout.status,
    checkoutUrl: checkout.checkoutUrl,
    mercadoPagoPreferenceId: checkout.mercadoPagoPreferenceId,
    mercadoPagoInitPoint: checkout.mercadoPagoInitPoint,
    expiresAt: checkout.expiresAt?.toISOString() ?? null,
  };
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

async function getCheckoutById(checkoutId: string) {
  return prisma.checkoutSession.findUnique({
    where: { id: checkoutId },
  });
}

async function upsertCharge(
  tx: Prisma.TransactionClient,
  input: {
    checkout: NonNullable<Awaited<ReturnType<typeof getCheckoutById>>>;
    transactionId: string;
    status: ChargeStatus;
    amountCharged: number;
    processedAt: Date;
    rejectionReason?: string;
  },
) {
  return tx.charge.upsert({
    where: { transactionId: input.transactionId },
    update: {
      checkoutSessionId: input.checkout.id,
      poolId: input.checkout.poolId,
      reservationId: input.checkout.reservationId,
      passengerUserId: input.checkout.passengerUserId,
      maxPrice: input.checkout.maxPrice,
      creditApplied: toDecimal(input.status === "PAID" ? decimalToNumber(input.checkout.creditApplied) : 0),
      amountCharged: toDecimal(input.amountCharged),
      currency: input.checkout.currency,
      status: input.status,
      provider: "MERCADO_PAGO",
      rejectionReason: input.rejectionReason ?? null,
      processedAt: input.processedAt,
    },
    create: {
      transactionId: input.transactionId,
      checkoutSessionId: input.checkout.id,
      poolId: input.checkout.poolId,
      reservationId: input.checkout.reservationId,
      passengerUserId: input.checkout.passengerUserId,
      maxPrice: input.checkout.maxPrice,
      creditApplied: toDecimal(input.status === "PAID" ? decimalToNumber(input.checkout.creditApplied) : 0),
      amountCharged: toDecimal(input.amountCharged),
      finalTripPrice: null,
      creditGranted: toDecimal(0),
      currency: input.checkout.currency,
      status: input.status,
      provider: "MERCADO_PAGO",
      rejectionReason: input.rejectionReason,
      processedAt: input.processedAt,
    },
  });
}

async function applyCheckoutOutcome(input: {
  checkoutId: string;
  targetStatus: CheckoutStatus;
  transactionId?: string;
  amountCharged?: number;
  rejectionReason?: string;
  processedAt: Date;
}) {
  const checkout = await prisma.checkoutSession.findUnique({
    where: { id: input.checkoutId },
  });

  if (!checkout) {
    throw new Error("CHECKOUT_NOT_FOUND");
  }

  const statusChanged = checkout.status !== input.targetStatus;
  const shouldCreateCharge =
    input.targetStatus === "PAID" ||
    input.targetStatus === "DENIED" ||
    (input.targetStatus === "PENDING" && Boolean(input.transactionId)) ||
    (input.targetStatus === "CANCELED" && Boolean(input.transactionId));

  await prisma.$transaction(async (tx) => {
    await tx.checkoutSession.update({
      where: { id: checkout.id },
      data: { status: input.targetStatus },
    });

    let chargeId: string | null = null;

    if (shouldCreateCharge && input.transactionId) {
      const chargeStatus: ChargeStatus = input.targetStatus === "PAID"
        ? "PAID"
        : input.targetStatus === "DENIED"
          ? "DENIED"
          : input.targetStatus === "PENDING"
            ? "PENDING"
            : "CANCELED";

      const charge = await upsertCharge(tx, {
        checkout,
        transactionId: input.transactionId,
        status: chargeStatus,
        amountCharged: input.amountCharged ?? 0,
        processedAt: input.processedAt,
        rejectionReason: input.rejectionReason,
      });

      chargeId = charge.id;
    }

    if (input.targetStatus === "PAID" && statusChanged && decimalToNumber(checkout.creditApplied) > 0) {
      const creditAccount = await tx.creditAccount.findUnique({
        where: { userId: checkout.passengerUserId },
      });

      if (!creditAccount) {
        throw new Error("CREDIT_ACCOUNT_NOT_FOUND");
      }

      await tx.creditAccount.update({
        where: { id: creditAccount.id },
        data: {
          balance: {
            decrement: checkout.creditApplied,
          },
        },
      });

      if (chargeId) {
        await tx.creditMovement.create({
          data: {
            creditAccountId: creditAccount.id,
            userId: checkout.passengerUserId,
            type: "CREDIT_APPLIED",
            amount: checkout.creditApplied,
            currency: checkout.currency,
            reservationId: checkout.reservationId,
            poolId: checkout.poolId,
            chargeId,
            description: "Saldo a favor aplicado en checkout.",
          },
        });
      }
    }
  });

  if (statusChanged && shouldNotifyRider(input.targetStatus)) {
    await notifyReservationPaymentResult({
      reservationId: checkout.reservationId,
      paymentStatus: input.targetStatus,
      transactionId: input.transactionId ?? buildDemoTransactionId("checkout_result"),
      maxPrice: decimalToNumber(checkout.maxPrice),
      creditApplied: input.targetStatus === "PAID" ? decimalToNumber(checkout.creditApplied) : undefined,
      amountCharged: input.targetStatus === "PAID" ? input.amountCharged ?? 0 : undefined,
      currency: checkout.currency,
      rejectionReason: input.rejectionReason,
      processedAt: input.processedAt.toISOString(),
    });
  }
}

function ensureHttpsAndNoLocalhost(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = "weshuttle-mock.example.com";
      url.port = "";
    }
    return url.toString();
  } catch {
    return urlStr;
  }
}

async function createMercadoPagoPreference(input: {
  checkoutId: string;
  reservationId: string;
  poolId: string;
  passengerUserId: string;
  amountToCharge: number;
  currency: string;
  appBaseUrl: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  expiresAt: Date;
}) {
  const preference = getPreferenceClient();
  const testBuyerEmail = process.env.MERCADOPAGO_TEST_BUYER_EMAIL?.trim();
  const preferenceBody = {
    items: [
      {
        id: input.checkoutId,
        title: `Reserva ${input.reservationId}`,
        description: `Checkout WeShuttle para la reserva ${input.reservationId}`,
        quantity: 1,
        currency_id: input.currency,
        unit_price: input.amountToCharge,
      },
    ],
    back_urls: {
      success: ensureHttpsAndNoLocalhost(
        buildCheckoutBackUrl({
          appBaseUrl: input.appBaseUrl,
          checkoutId: input.checkoutId,
          kind: "success",
        })
      ),
      failure: ensureHttpsAndNoLocalhost(
        buildCheckoutBackUrl({
          appBaseUrl: input.appBaseUrl,
          checkoutId: input.checkoutId,
          kind: "failure",
        })
      ),
      pending: ensureHttpsAndNoLocalhost(
        buildCheckoutBackUrl({
          appBaseUrl: input.appBaseUrl,
          checkoutId: input.checkoutId,
          kind: "pending",
        })
      ),
    },
    auto_return: "approved",
    expires: true,
    expiration_date_to: input.expiresAt.toISOString(),
    external_reference: input.checkoutId,
    metadata: {
      checkoutId: input.checkoutId,
      reservationId: input.reservationId,
      poolId: input.poolId,
      passengerUserId: input.passengerUserId,
    },
    ...(testBuyerEmail
      ? {
          payer: {
            email: testBuyerEmail,
          },
        }
      : {}),
  };

  console.info("MercadoPago preference using test buyer email", {
    checkoutId: input.checkoutId,
    reservationId: input.reservationId,
    usingTestBuyerEmail: Boolean(testBuyerEmail),
  });

  let response;

  try {
    response = await preference.create({
      body: preferenceBody,
    });
  } catch (error) {
    const errorSummary = summarizeMercadoPagoError(error);

    console.error("MercadoPago preference creation failed", {
      reservationId: input.reservationId,
      checkoutId: input.checkoutId,
      amountToCharge: input.amountToCharge,
      currency: input.currency,
      message: errorSummary.message,
      status: errorSummary.status,
      bodySummary: errorSummary.bodySummary,
    });

    throw error;
  }

  const mercadoPagoPreferenceId = response.id?.trim();
  const mercadoPagoInitPoint = response.sandbox_init_point?.trim() || response.init_point?.trim() || null;

  if (!mercadoPagoPreferenceId || !mercadoPagoInitPoint) {
    throw new Error("MERCADOPAGO_PREFERENCE_INCOMPLETE");
  }

  return {
    mercadoPagoPreferenceId,
    mercadoPagoInitPoint,
  };
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
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 60 * 60 * 1000);

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
      status: "CREATED",
      provider: "MERCADO_PAGO",
      checkoutUrl: null,
      mercadoPagoPreferenceId: null,
      mercadoPagoInitPoint: null,
      expiresAt,
    },
  });

  const checkoutUrl = buildCheckoutUrl(input.appBaseUrl, checkoutSession.id);
  const isDemoMode = !isMercadoPagoConfigured();

  try {
    if (amountToCharge > 0 && !isDemoMode) {
      const preferenceData = await createMercadoPagoPreference({
        checkoutId: checkoutSession.id,
        reservationId: input.reservationId,
        poolId: input.poolId,
        passengerUserId: input.passengerUserId,
        amountToCharge,
        currency: input.currency,
        appBaseUrl: input.appBaseUrl,
        successUrl: input.successUrl,
        failureUrl: input.failureUrl,
        pendingUrl: input.pendingUrl,
        expiresAt,
      });

      await prisma.checkoutSession.update({
        where: { id: checkoutSession.id },
        data: {
          checkoutUrl,
          mercadoPagoPreferenceId: preferenceData.mercadoPagoPreferenceId,
          mercadoPagoInitPoint: preferenceData.mercadoPagoInitPoint,
        },
      });
    } else {
      await prisma.checkoutSession.update({
        where: { id: checkoutSession.id },
        data: { checkoutUrl },
      });
    }

    let checkoutStatus: CheckoutStatus = "CREATED";

    if (amountToCharge === 0) {
      await applyCheckoutOutcome({
        checkoutId: checkoutSession.id,
        targetStatus: "PAID",
        transactionId: buildDemoTransactionId("credit_only"),
        amountCharged: 0,
        processedAt: new Date(),
      });

      checkoutStatus = "PAID";
    }

    return {
      ok: true,
      status: 201,
      data: {
        checkoutId: checkoutSession.id,
        reservationId: input.reservationId,
        poolId: input.poolId,
        passengerUserId: input.passengerUserId,
        checkoutUrl,
        maxPrice: input.maxPrice,
        availableCredit,
        creditApplied,
        amountToCharge,
        currency: input.currency,
        checkoutStatus,
        isDemoMode,
      },
    };
  } catch (error) {
    await prisma.checkoutSession.delete({
      where: { id: checkoutSession.id },
    });

    const message = error instanceof Error ? error.message : "No se pudo crear la preferencia de Mercado Pago.";

    return {
      ok: false,
      status: 500,
      error: "CHECKOUT_CREATION_FAILED",
      message,
    };
  }
}

export async function getCheckoutPageData(checkoutId: string): Promise<CheckoutPageData | null> {
  const checkout = await getCheckoutById(checkoutId);

  if (!checkout) {
    return null;
  }

  return {
    checkout: buildCheckoutSummary(checkout),
    isDemoMode: !isMercadoPagoConfigured(),
  };
}

export async function resolveDemoCheckout(checkoutId: string, status: DemoCheckoutStatus) {
  const checkout = await getCheckoutById(checkoutId);

  if (!checkout) {
    throw new Error("CHECKOUT_NOT_FOUND");
  }

  if (isMercadoPagoConfigured()) {
    throw new Error("DEMO_MODE_DISABLED");
  }

  if (checkout.amountToCharge.toNumber() <= 0) {
    return;
  }

  const processedAt = new Date();

  if (status === "PAID") {
    await applyCheckoutOutcome({
      checkoutId,
      targetStatus: "PAID",
      transactionId: buildDemoTransactionId("demo_paid"),
      amountCharged: checkout.amountToCharge.toNumber(),
      processedAt,
    });

    return;
  }

  if (status === "DENIED") {
    await applyCheckoutOutcome({
      checkoutId,
      targetStatus: "DENIED",
      transactionId: buildDemoTransactionId("demo_denied"),
      amountCharged: 0,
      rejectionReason: "MOCK_PAYMENT_DENIED",
      processedAt,
    });

    return;
  }

  if (status === "CANCELED") {
    await applyCheckoutOutcome({
      checkoutId,
      targetStatus: "CANCELED",
      processedAt,
    });

    return;
  }

  await applyCheckoutOutcome({
    checkoutId,
    targetStatus: "EXPIRED",
    processedAt,
  });
}

export async function reconcileCheckoutReturn(
  input: ReconcileCheckoutReturnInput,
): Promise<ReconcileCheckoutReturnResult> {
  const normalizedPaymentId = normalizeMercadoPagoQueryParam(input.paymentId);
  const normalizedStatus = normalizeMercadoPagoQueryParam(input.status);
  const normalizedCollectionStatus = normalizeMercadoPagoQueryParam(input.collectionStatus);
  const normalizedExternalReference = normalizeMercadoPagoQueryParam(input.externalReference);
  const normalizedMerchantOrderId = normalizeMercadoPagoQueryParam(input.merchantOrderId);
  const normalizedPreferenceId = normalizeMercadoPagoQueryParam(input.preferenceId);
  const normalizedPaymentType = normalizeMercadoPagoQueryParam(input.paymentType);
  const normalizedProcessingMode = normalizeMercadoPagoQueryParam(input.processingMode);

  console.info("MercadoPago checkout return", {
    checkoutId: input.checkoutId,
    payment_id: normalizedPaymentId,
    status: normalizedStatus,
    collection_status: normalizedCollectionStatus,
    merchant_order_id: normalizedMerchantOrderId,
    external_reference: normalizedExternalReference,
    preference_id: normalizedPreferenceId,
    payment_type: normalizedPaymentType,
    processing_mode: normalizedProcessingMode,
  });

  const checkout = await getCheckoutById(input.checkoutId);

  if (!checkout) {
    return {
      ok: false,
      error: "CHECKOUT_NOT_FOUND",
      message: "No se encontro el checkout solicitado.",
    };
  }

  if (normalizedExternalReference && normalizedExternalReference !== checkout.id) {
    return {
      ok: false,
      error: "INVALID_EXTERNAL_REFERENCE",
      message: "La referencia externa devuelta por Mercado Pago no coincide con el checkout.",
      data: {
        checkout: buildCheckoutSummary(checkout),
        isDemoMode: !isMercadoPagoConfigured(),
      },
    };
  }

  let mercadoPagoStatus = normalizedStatus;
  let paymentId = normalizedPaymentId;
  let processedAt = new Date();
  let rejectionReason: string | undefined;
  let amountCharged = checkout.amountToCharge.toNumber();

  if (!normalizedPaymentId) {
    console.info("Mercado Pago return without payment_id", {
      checkoutId: input.checkoutId,
      preference_id: normalizedPreferenceId,
      external_reference: normalizedExternalReference,
      status: normalizedStatus,
      collection_status: normalizedCollectionStatus,
      merchant_order_id: normalizedMerchantOrderId,
      processing_mode: normalizedProcessingMode,
    });
  }

  if (normalizedPaymentId && isMercadoPagoConfigured()) {
    try {
      const paymentResponse = await getPaymentClient().get({
        id: normalizedPaymentId,
      });

      console.info("MercadoPago payment details", {
        payment_id: paymentResponse.id?.toString() ?? normalizedPaymentId,
        status: paymentResponse.status,
        status_detail: paymentResponse.status_detail,
        payment_method_id: paymentResponse.payment_method_id,
        payment_type_id: paymentResponse.payment_type_id,
        external_reference: paymentResponse.external_reference,
      });

      if (paymentResponse.external_reference && paymentResponse.external_reference !== checkout.id) {
        return {
          ok: false,
          error: "INVALID_PAYMENT_REFERENCE",
          message: "El pago recuperado desde Mercado Pago no pertenece a este checkout.",
          data: {
            checkout: buildCheckoutSummary(checkout),
            isDemoMode: false,
          },
        };
      }

      mercadoPagoStatus = paymentResponse.status ?? mercadoPagoStatus;
      paymentId = paymentResponse.id?.toString() ?? paymentId;
      rejectionReason = paymentResponse.status_detail ?? undefined;
      amountCharged = paymentResponse.transaction_amount ?? amountCharged;
      processedAt = buildProcessedAt(paymentResponse.date_approved ?? paymentResponse.date_created);
    } catch (error) {
      const errorSummary = summarizeMercadoPagoError(error);

      console.warn("MercadoPago payment lookup failed", {
        checkoutId: input.checkoutId,
        payment_id: normalizedPaymentId,
        message: errorSummary.message,
        status: errorSummary.status,
        bodySummary: errorSummary.bodySummary,
      });

      // Si la consulta falla, continuamos con los query params para no bloquear la demo del retorno.
    }
  }

  const targetStatus = mapMercadoPagoStatus(mercadoPagoStatus, input.routeKind);

  await applyCheckoutOutcome({
    checkoutId: checkout.id,
    targetStatus,
    transactionId: paymentId,
    amountCharged: targetStatus === "PAID" || targetStatus === "PENDING" ? amountCharged : 0,
    rejectionReason,
    processedAt,
  });

  const updatedCheckout = await getCheckoutById(checkout.id);

  if (!updatedCheckout) {
    return {
      ok: false,
      error: "CHECKOUT_NOT_FOUND",
      message: "No se encontro el checkout solicitado.",
    };
  }

  return {
    ok: true,
    data: {
      checkout: buildCheckoutSummary(updatedCheckout),
      isDemoMode: !isMercadoPagoConfigured(),
    },
  };
}
