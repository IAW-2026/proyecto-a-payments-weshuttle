import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/payments/checkout";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    reservation_id: string;
  }>;
};

function isValidUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireApiRole(["rider", "admin"]);

  if (!authResult.ok) {
    return authResult.response;
  }

  const { reservation_id: reservationId } = await context.params;

  if (!reservationId?.trim()) {
    return NextResponse.json(
      {
        error: "INVALID_RESERVATION_ID",
        message: "reservation_id es obligatorio.",
      },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_JSON",
        message: "El cuerpo del request debe ser un JSON valido.",
      },
      { status: 400 },
    );
  }

  const poolId = typeof (body as { pool_id?: unknown }).pool_id === "string"
    ? (body as { pool_id: string }).pool_id.trim()
    : "";
  const passengerUserId = typeof (body as { passenger_user_id?: unknown }).passenger_user_id === "string"
    ? (body as { passenger_user_id: string }).passenger_user_id.trim()
    : "";
  const maxPriceValue = (body as { max_price?: unknown }).max_price;
  const maxPrice = typeof maxPriceValue === "number" ? maxPriceValue : null;
  const currency = typeof (body as { currency?: unknown }).currency === "string"
    ? (body as { currency: string }).currency.trim()
    : "";
  const successUrl = typeof (body as { success_url?: unknown }).success_url === "string"
    ? (body as { success_url: string }).success_url.trim()
    : "";
  const failureUrl = typeof (body as { failure_url?: unknown }).failure_url === "string"
    ? (body as { failure_url: string }).failure_url.trim()
    : "";

  if (!poolId || !passengerUserId || maxPrice === null || maxPrice < 0 || !currency || !isValidUrl(successUrl) || !isValidUrl(failureUrl)) {
    return NextResponse.json(
      {
        error: "INVALID_BODY",
        message: "pool_id, passenger_user_id, max_price, currency, success_url y failure_url son obligatorios.",
      },
      { status: 400 },
    );
  }

  const paymentToken = typeof (body as { payment_token?: unknown }).payment_token === "string"
    ? (body as { payment_token: string }).payment_token.trim()
    : undefined;
  const paymentMethodId = typeof (body as { payment_method_id?: unknown }).payment_method_id === "string"
    ? (body as { payment_method_id: string }).payment_method_id.trim()
    : undefined;
  const payerEmail = typeof (body as { payer_email?: unknown }).payer_email === "string"
    ? (body as { payer_email: string }).payer_email.trim()
    : undefined;
  const mockPaymentStatus = typeof (body as { mock_payment_status?: unknown }).mock_payment_status === "string"
    ? (body as { mock_payment_status: "PAID" | "DENIED" | "CANCELED" | "EXPIRED" }).mock_payment_status
    : undefined;
  const expiresAt = typeof (body as { expires_at?: unknown }).expires_at === "string"
    ? (body as { expires_at: string }).expires_at
    : undefined;

  const result = await createCheckoutSession({
    reservationId: reservationId.trim(),
    poolId,
    passengerUserId,
    maxPrice,
    currency,
    successUrl,
    failureUrl,
    paymentToken,
    paymentMethodId,
    payerEmail,
    mockPaymentStatus,
    expiresAt,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        message: result.message,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      checkout_id: result.data.checkoutId,
      reservation_id: result.data.reservationId,
      pool_id: result.data.poolId,
      passenger_user_id: result.data.passengerUserId,
      payment_url: result.data.paymentUrl,
      max_price: result.data.maxPrice,
      available_credit: result.data.availableCredit,
      credit_applied: result.data.creditApplied,
      amount_to_charge: result.data.amountToCharge,
      currency: result.data.currency,
      checkout_status: result.data.checkoutStatus,
    },
    { status: result.status },
  );
}
