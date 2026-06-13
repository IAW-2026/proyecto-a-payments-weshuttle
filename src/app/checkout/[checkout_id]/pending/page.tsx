import { notFound } from "next/navigation";
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
    merchant_order_id?: string;
    external_reference?: string;
    return_url?: string;
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
    merchantOrderId: query.merchant_order_id,
    externalReference: query.external_reference,
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
      title="Resultado del checkout"
      description="Payments App recibio el retorno de Mercado Pago y actualizo el estado interno del checkout."
    >
      {!result.ok ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
          {result.message}
        </section>
      ) : null}
      <CheckoutSummaryCard data={data} />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <CheckoutResultActions checkoutId={checkoutId} returnUrl={query.return_url} />
      </section>
    </CheckoutLayout>
  );
}
