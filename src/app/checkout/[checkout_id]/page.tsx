import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { getCheckoutPageData } from "@/lib/payments/checkout";
import { resolveDemoCheckoutAction } from "./actions";
import { CheckoutLayout, CheckoutSummaryCard } from "./checkout-ui";

type PageProps = {
  params: Promise<{
    checkout_id: string;
  }>;
};

export default async function CheckoutPage({ params }: PageProps) {
  const [authContext, resolvedParams] = await Promise.all([
    requirePageRole(["rider", "admin"]),
    params,
  ]);
  const checkoutId = resolvedParams.checkout_id;
  const data = await getCheckoutPageData(checkoutId);

  if (!data) {
    notFound();
  }

  if (authContext.role === "rider" && data.checkout.passengerUserId !== authContext.clerkUserId) {
    notFound();
  }

  const canPayWithMercadoPago = Boolean(
    data.checkout.mercadoPagoInitPoint &&
      data.checkout.amountToCharge > 0 &&
      data.checkout.status === "CREATED",
  );

  return (
    <CheckoutLayout
      title="Resumen del checkout"
      description="Antes de ir a Mercado Pago, esta pantalla muestra cuanto se cubre con credito, cuanto falta pagar y cual es el estado actual del checkout."
    >
      <CheckoutSummaryCard data={data} />

      <SectionCard>
        <h2 className="text-xl font-semibold text-slate-900">Siguiente paso</h2>
        <p className="mt-2 text-sm text-slate-600">
          Elige la accion correspondiente segun el estado actual del checkout. Esta pantalla solo ordena la demo; no modifica el flujo funcional de Mercado Pago.
        </p>

        {data.checkout.amountToCharge === 0 ? (
          <div className="mt-4 space-y-4">
            <AlertBanner tone="success" title="Pago cubierto con saldo a favor">
              Este checkout se resolvio sin pasar por Mercado Pago porque el credito disponible alcanzo para cubrir el total.
            </AlertBanner>
            <Link
              href={`/rider?payment=success&checkout_id=${checkoutId}`}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Volver a Rider
            </Link>
          </div>
        ) : data.isDemoMode ? (
          <div className="mt-4 space-y-4">
            <AlertBanner tone="warning" title="Herramientas de demo habilitadas">
              Mercado Pago no esta configurado en este entorno. Puedes resolver el checkout desde Payments App para mostrar cada resultado durante la demo.
            </AlertBanner>
            <div className="grid gap-3 sm:grid-cols-2">
              <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "PAID")}>
                <button type="submit" className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                  Simular PAID
                </button>
              </form>
              <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "DENIED")}>
                <button type="submit" className="w-full rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500">
                  Simular DENIED
                </button>
              </form>
              <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "CANCELED")}>
                <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Simular CANCELED
                </button>
              </form>
              <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "EXPIRED")} className="sm:col-span-2">
                <button type="submit" className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                  Simular EXPIRED
                </button>
              </form>
            </div>
          </div>
        ) : canPayWithMercadoPago ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Al continuar, Payments App te redirige a Mercado Pago Checkout Pro en modo Sandbox para mantener el flujo real.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={data.checkout.mercadoPagoInitPoint!}
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                Pagar con Mercado Pago
              </Link>
              <Link
                href="/rider"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900"
              >
                Volver a Rider
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <AlertBanner tone="info" title="No hay una accion de pago disponible">
              Este checkout ya fue procesado o todavia no tiene una preferencia activa para redirigir al usuario.
            </AlertBanner>
            <Link
              href="/rider"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900"
            >
              Volver a Rider
            </Link>
          </div>
        )}
      </SectionCard>
    </CheckoutLayout>
  );
}
