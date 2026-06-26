"use server";

import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getCheckoutPageData, resolveDemoCheckout } from "@/lib/payments/checkout";

type DemoCheckoutStatus = "PAID" | "DENIED" | "CANCELED" | "EXPIRED";

function getResultPath(checkoutId: string, status: DemoCheckoutStatus) {
  if (status === "PAID") {
    return `/checkout/${checkoutId}/success?demo_status=PAID`;
  }

  if (status === "DENIED") {
    return `/checkout/${checkoutId}/failure?demo_status=DENIED`;
  }

  if (status === "CANCELED") {
    return `/checkout/${checkoutId}/failure?demo_status=CANCELED`;
  }

  return `/checkout/${checkoutId}/failure?demo_status=EXPIRED`;
}

export async function resolveDemoCheckoutAction(checkoutId: string, status: DemoCheckoutStatus) {
  const authContext = await requirePageRole(["rider", "admin"]);
  const checkoutData = await getCheckoutPageData(checkoutId);

  if (!checkoutData) {
    notFound();
  }

  if (authContext.role === "rider" && checkoutData.checkout.passengerUserId !== authContext.clerkUserId) {
    notFound();
  }

  await resolveDemoCheckout(checkoutId, status);
  redirect(getResultPath(checkoutId, status));
}
