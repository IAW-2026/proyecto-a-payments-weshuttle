"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/payments/checkout";

function redirectWithState(input: {
  message?: string;
  error?: string;
  reservationId?: string;
  path?: string;
}): never {
  const params = new URLSearchParams();

  if (input.message) {
    params.set("message", input.message);
  }

  if (input.error) {
    params.set("error", input.error);
  }

  if (input.reservationId) {
    params.set("reservation_id", input.reservationId);
  }

  redirect(`${input.path ?? "/rider"}?${params.toString()}`);
}

function getTrimmedValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function buildDefaultRiderReturnUrl(baseUrl: string, payment: "success" | "failure" | "pending") {
  return `${baseUrl.replace(/\/$/, "")}?payment=${payment}`;
}

export async function createDemoCheckoutAction(formData: FormData) {
  const authContext = await requirePageRole(["rider"]);
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = requestHeaders.get("host");
  const origin = requestHeaders.get("origin")
    ?? (forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : null)
    ?? (host ? `http://${host}` : null);
  const riderAppUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const defaultSuccessUrl = riderAppUrl
    ? buildDefaultRiderReturnUrl(riderAppUrl, "success")
    : origin
      ? `${origin}/rider?payment=success`
      : "";
  const defaultFailureUrl = riderAppUrl
    ? buildDefaultRiderReturnUrl(riderAppUrl, "failure")
    : origin
      ? `${origin}/rider?payment=failure`
      : "";
  const defaultPendingUrl = riderAppUrl
    ? buildDefaultRiderReturnUrl(riderAppUrl, "pending")
    : origin
      ? `${origin}/rider?payment=pending`
      : "";

  const reservationId = getTrimmedValue(formData, "reservationId");
  const poolId = getTrimmedValue(formData, "poolId");
  const maxPrice = Number(getTrimmedValue(formData, "maxPrice"));
  const currency = getTrimmedValue(formData, "currency") || "ARS";
  const successUrl = getTrimmedValue(formData, "successUrl") || defaultSuccessUrl;
  const failureUrl = getTrimmedValue(formData, "failureUrl") || defaultFailureUrl;
  const pendingUrl = getTrimmedValue(formData, "pendingUrl") || defaultPendingUrl;

  if (!reservationId || !poolId || !Number.isFinite(maxPrice) || maxPrice < 0 || !origin) {
    redirectWithState({
      error: "reservation_id, pool_id, max_price y el origen de la app son obligatorios.",
      reservationId: reservationId || undefined,
      path: "/rider/checkout-demo",
    });
  }

  const result = await createCheckoutSession({
    reservationId,
    poolId,
    passengerUserId: authContext.clerkUserId,
    maxPrice,
    currency,
    successUrl,
    failureUrl,
    pendingUrl,
    appBaseUrl: origin,
  });

  if (!result.ok) {
    redirectWithState({
      error: result.message,
      reservationId,
      path: "/rider/checkout-demo",
    });
  }

  const checkoutResult = result.data;

  revalidatePath("/rider");
  revalidatePath("/rider/checkouts");
  revalidatePath("/rider/reservations");

  if (checkoutResult.checkoutUrl) {
    redirect(checkoutResult.checkoutUrl);
  }

  redirectWithState({
    message: `Checkout ${checkoutResult.checkoutStatus.toLowerCase()} generado correctamente.`,
    reservationId,
    path: "/rider/checkout-demo",
  });
}
