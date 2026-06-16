import { notFound } from "next/navigation";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { getCheckoutPageData, reconcileCheckoutReturn } from "@/lib/payments/checkout";
import {
  CheckoutLayout,
  CheckoutResultActions,
  CheckoutSummaryCard,
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

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const authContext = await requirePageRole(["rider", "admin"]);
  const { checkout_id: checkoutId } = await params;
  const query = await searchParams;

  let data = null;
  let errorMessage: string | null = null;

  if (query.demo_status) {
    data = await getCheckoutPageData(checkoutId);
  } else {
    const result = await reconcileCheckoutReturn({
      checkoutId,
      routeKind: "success",
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
    notFound();
  }

  return (
    <CheckoutLayout
      title="Pago confirmado"
      description="Payments App recibio el retorno de Mercado Pago y actualizo el estado interno del checkout para que puedas continuar la demo con claridad."
    >
      {errorMessage ? (
        <AlertBanner tone="danger">{errorMessage}</AlertBanner>
      ) : null}
      <CheckoutSummaryCard data={data} />
      <SectionCard>
        <AlertBanner tone="success" title="El pago fue acreditado">
          El usuario ya puede volver a Rider con el resultado aplicado sobre su reserva.
        </AlertBanner>
        <div className="mt-6">
        <CheckoutResultActions checkoutId={checkoutId} paymentResult="success" />
        </div>
      </SectionCard>
    </CheckoutLayout>
  );
}
