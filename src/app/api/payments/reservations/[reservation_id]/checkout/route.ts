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

  const { clerkUserId, role } = authResult.context;

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
  const pendingUrl = typeof (body as { pending_url?: unknown }).pending_url === "string"
    ? (body as { pending_url: string }).pending_url.trim()
    : "";

  const isService = authResult.context.type === "service";
  const isPassengerUserIdMissing = (role === "rider" || isService) ? !passengerUserId : false;

  if (!poolId || isPassengerUserIdMissing || maxPrice === null || maxPrice < 0 || !currency || !isValidUrl(successUrl) || !isValidUrl(failureUrl) || !isValidUrl(pendingUrl)) {
    return NextResponse.json(
      {
        error: "INVALID_BODY",
        message: "pool_id, passenger_user_id, max_price, currency, success_url, failure_url y pending_url son obligatorios.",
      },
      { status: 400 },
    );
  }
  const expiresAt = typeof (body as { expires_at?: unknown }).expires_at === "string"
    ? (body as { expires_at: string }).expires_at
    : undefined;

  if (role === "rider" && passengerUserId !== clerkUserId) {
    return NextResponse.json(
      {
        error: "FORBIDDEN_PASSENGER_USER_ID",
        message: "Un rider solo puede crear checkouts para su propio usuario autenticado.",
      },
      { status: 403 },
    );
  }

  const resolvedPassengerUserId = (isService || role === "admin")
    ? passengerUserId || (clerkUserId ?? "")
    : clerkUserId ?? "";

  const result = await createCheckoutSession({
    reservationId: reservationId.trim(),
    poolId,
    passengerUserId: resolvedPassengerUserId,
    maxPrice,
    currency,
    successUrl,
    failureUrl,
    pendingUrl,
    appBaseUrl: new URL(request.url).origin,
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
      checkout_url: result.data.checkoutUrl,
      max_price: result.data.maxPrice,
      available_credit: result.data.availableCredit,
      credit_applied: result.data.creditApplied,
      amount_to_charge: result.data.amountToCharge,
      currency: result.data.currency,
      checkout_status: result.data.checkoutStatus,
      is_demo_mode: result.data.isDemoMode,
    },
    { status: result.status },
  );
}
