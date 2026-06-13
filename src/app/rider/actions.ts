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

  redirect(`/rider?${params.toString()}`);
}

function getTrimmedValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
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

  const reservationId = getTrimmedValue(formData, "reservationId");
  const poolId = getTrimmedValue(formData, "poolId");
  const maxPrice = Number(getTrimmedValue(formData, "maxPrice"));
  const currency = getTrimmedValue(formData, "currency") || "ARS";
  const successUrl = getTrimmedValue(formData, "successUrl") || "https://rider-app.local/success";
  const failureUrl = getTrimmedValue(formData, "failureUrl") || "https://rider-app.local/failure";
  const pendingUrl = getTrimmedValue(formData, "pendingUrl") || "https://rider-app.local/pending";

  if (!reservationId || !poolId || !Number.isFinite(maxPrice) || maxPrice < 0 || !origin) {
    redirectWithState({
      error: "reservation_id, pool_id, max_price y el origen de la app son obligatorios.",
      reservationId: reservationId || undefined,
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
    });
  }

  const checkoutResult = result.data;

  revalidatePath("/rider");

  if (checkoutResult.checkoutUrl) {
    redirect(checkoutResult.checkoutUrl);
  }

  redirectWithState({
    message: `Checkout ${checkoutResult.checkoutStatus.toLowerCase()} generado correctamente.`,
    reservationId,
  });
}
