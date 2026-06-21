import { notFound } from "next/navigation";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { getCheckoutPageData, reconcileCheckoutReturn } from "@/lib/payments/checkout";
import {
  CheckoutLayout,
  CheckoutResultActions,
  CheckoutSummaryCard,
  AccountConflictView,
} from "../checkout-ui";

type PageProps = {
  params: Promise<{
    checkout_id: string;
  }>;
  searchParams: Promise<{
    payment_id?: string;
    status?: string;
    collection_status?: string;
    merchant_order_id?: string;
    external_reference?: string;
    preference_id?: string;
    payment_type?: string;
    processing_mode?: string;
    demo_status?: string;
  }>;
};

export default async function CheckoutFailurePage({ params, searchParams }: PageProps) {
  const [authContext, resolvedParams, query] = await Promise.all([
    requirePageRole(["rider", "admin"]),
    params,
    searchParams,
  ]);
  const checkoutId = resolvedParams.checkout_id;

  let data = null;
  let errorMessage: string | null = null;

  if (query.demo_status) {
    data = await getCheckoutPageData(checkoutId);
  } else {
    const result = await reconcileCheckoutReturn({
      checkoutId,
      routeKind: "failure",
      paymentId: query.payment_id,
      status: query.status,
      collectionStatus: query.collection_status,
      merchantOrderId: query.merchant_order_id,
      externalReference: query.external_reference,
      preferenceId: query.preference_id,
      paymentType: query.payment_type,
      processingMode: query.processing_mode,
    });

    data = result.ok ? result.data : result.data ?? null;
    errorMessage = result.ok ? null : result.message;
  }

  if (!data) {
    notFound();
  }

  if (authContext.role === "rider" && data.checkout.passengerUserId !== authContext.clerkUserId) {
    return <AccountConflictView checkoutId={checkoutId} />;
  }

  return (
    <CheckoutLayout
      title="Pago no completado"
      description="Payments App recibio el retorno del checkout y guardo el estado resultante para que puedas decidir el siguiente paso."
    >
      {errorMessage ? (
        <AlertBanner tone="danger">{errorMessage}</AlertBanner>
      ) : null}
      <CheckoutSummaryCard data={data} />
      <SectionCard>
        <AlertBanner tone="danger" title="La operacion no se acredito">
          Puedes volver a Rider para reintentar el flujo o revisar por que el checkout quedo rechazado, cancelado o expirado dentro de la demo.
        </AlertBanner>
        <div className="mt-6">
          <CheckoutResultActions checkoutId={checkoutId} paymentResult="failure" />
        </div>
      </SectionCard>
    </CheckoutLayout>
  );
}
