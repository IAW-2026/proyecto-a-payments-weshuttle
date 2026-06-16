import { notFound } from "next/navigation";
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

export default async function CheckoutFailurePage({ params, searchParams }: PageProps) {
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
    notFound();
  }

  return (
    <CheckoutLayout
      title="Resultado del checkout"
      description="Payments App recibio el retorno de Mercado Pago y actualizo el estado interno del checkout."
    >
      {errorMessage ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
          {errorMessage}
        </section>
      ) : null}
      <CheckoutSummaryCard data={data} />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <CheckoutResultActions checkoutId={checkoutId} paymentResult="failure" />
      </section>
    </CheckoutLayout>
  );
}
