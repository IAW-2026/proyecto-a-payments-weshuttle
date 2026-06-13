import Link from "next/link";
import { notFound } from "next/navigation";
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
  const authContext = await requirePageRole(["rider", "admin"]);
  const { checkout_id: checkoutId } = await params;
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
      description="Payments App intermedia el flujo: aqui se revisa el resumen y luego se deriva a Mercado Pago Checkout Pro."
    >
      <CheckoutSummaryCard data={data} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-slate-900">Siguiente paso</h2>

        {data.checkout.amountToCharge === 0 ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Este checkout se cubrio por completo con saldo a favor y ya quedo marcado como pagado.
          </p>
        ) : data.isDemoMode ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mercado Pago no esta configurado en este entorno. Puedes resolver el checkout en modo demo desde Payments App.
            </p>
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
              Al continuar, Payments App te redirige a Mercado Pago Checkout Pro en modo Sandbox.
            </p>
            <Link
              href={data.checkout.mercadoPagoInitPoint!}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Pagar con Mercado Pago
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Este checkout ya fue procesado o aun no tiene una preferencia activa para redirigir al usuario.
          </p>
        )}
      </section>
    </CheckoutLayout>
  );
}
