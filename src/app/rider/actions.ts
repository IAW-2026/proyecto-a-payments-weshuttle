"use server";

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

  const reservationId = getTrimmedValue(formData, "reservationId");
  const poolId = getTrimmedValue(formData, "poolId");
  const maxPrice = Number(getTrimmedValue(formData, "maxPrice"));
  const currency = getTrimmedValue(formData, "currency") || "ARS";
  const successUrl = getTrimmedValue(formData, "successUrl") || "https://rider-app.local/success";
  const failureUrl = getTrimmedValue(formData, "failureUrl") || "https://rider-app.local/failure";
  const mockPaymentStatus = getTrimmedValue(formData, "mockPaymentStatus") as
    | "PAID"
    | "DENIED"
    | "CANCELED"
    | "EXPIRED"
    | "";
  const paymentToken = getTrimmedValue(formData, "paymentToken") || undefined;
  const paymentMethodId = getTrimmedValue(formData, "paymentMethodId") || undefined;
  const payerEmail = getTrimmedValue(formData, "payerEmail") || undefined;

  if (!reservationId || !poolId || !Number.isFinite(maxPrice) || maxPrice < 0) {
    redirectWithState({
      error: "reservation_id, pool_id y max_price son obligatorios.",
      reservationId: reservationId || undefined,
    });
  }

  if (
    mockPaymentStatus !== "PAID" &&
    mockPaymentStatus !== "DENIED" &&
    mockPaymentStatus !== "CANCELED" &&
    mockPaymentStatus !== "EXPIRED"
  ) {
    redirectWithState({
      error: "Debes elegir un resultado de checkout para la simulacion.",
      reservationId,
    });
  }

  const validatedMockPaymentStatus = mockPaymentStatus as
    | "PAID"
    | "DENIED"
    | "CANCELED"
    | "EXPIRED";

  const result = await createCheckoutSession({
    reservationId,
    poolId,
    passengerUserId: authContext.clerkUserId,
    maxPrice,
    currency,
    successUrl,
    failureUrl,
    paymentToken,
    paymentMethodId,
    payerEmail,
    mockPaymentStatus: validatedMockPaymentStatus,
  });

  if (!result.ok) {
    redirectWithState({
      error: result.message,
      reservationId,
    });
  }

  const checkoutResult = result.data;

  revalidatePath("/rider");

  redirectWithState({
    message: `Checkout ${checkoutResult.checkoutStatus.toLowerCase()} generado correctamente.`,
    reservationId,
  });
}
