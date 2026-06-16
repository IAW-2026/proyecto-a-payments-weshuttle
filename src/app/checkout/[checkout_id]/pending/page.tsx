import { notFound } from "next/navigation";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { reconcileCheckoutReturn } from "@/lib/payments/checkout";
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
  }>;
};

export default async function CheckoutPendingPage({ params, searchParams }: PageProps) {
  const authContext = await requirePageRole(["rider", "admin"]);
  const { checkout_id: checkoutId } = await params;
  const query = await searchParams;

  const result = await reconcileCheckoutReturn({
    checkoutId,
    routeKind: "pending",
    paymentId: query.payment_id,
    status: query.status,
    collectionStatus: query.collection_status,
    merchantOrderId: query.merchant_order_id,
    externalReference: query.external_reference,
    preferenceId: query.preference_id,
    paymentType: query.payment_type,
    processingMode: query.processing_mode,
  });

  const data = result.ok ? result.data : result.data;

  if (!data) {
    notFound();
  }

  if (authContext.role === "rider" && data.checkout.passengerUserId !== authContext.clerkUserId) {
    notFound();
  }

  return (
    <CheckoutLayout
      title="Pago pendiente"
      description="Payments App recibio el retorno del checkout y dejo registrado que la operacion sigue en revision."
    >
      {!result.ok ? (
        <AlertBanner tone="danger">{result.message}</AlertBanner>
      ) : null}
      <CheckoutSummaryCard data={data} />
      <SectionCard>
        <AlertBanner tone="warning" title="La acreditacion puede demorar">
          Mientras el pago siga pendiente, lo recomendable es volver a Rider y revisar el estado nuevamente mas tarde.
        </AlertBanner>
        <div className="mt-6">
        <CheckoutResultActions checkoutId={checkoutId} paymentResult="pending" />
        </div>
      </SectionCard>
    </CheckoutLayout>
  );
}
