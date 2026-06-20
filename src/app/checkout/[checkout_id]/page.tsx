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
      title="Confirmar Pago de Viaje"
      description="Revisa el detalle de tu viaje y completa el pago de forma segura."
    >
      <CheckoutSummaryCard data={data} />

      <SectionCard>
        <h2 className="text-lg font-bold text-primary">Métodos de pago disponibles</h2>
        <p className="mt-1 text-xs text-slate-gray">
          Selecciona tu método de pago preferido para completar la transacción.
        </p>

        {data.checkout.amountToCharge === 0 ? (
          <div className="mt-4 space-y-4">
            <AlertBanner tone="success" title="¡Pago cubierto con tu saldo a favor!">
              El saldo disponible en tu cuenta cubrió la totalidad del viaje, por lo que no es necesario realizar ningún cargo adicional.
            </AlertBanner>
            <Link
              href={`/rider?payment=success&checkout_id=${checkoutId}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition hover:scale-[1.01] active:scale-[0.99] duration-200"
            >
              Confirmar y Volver a Rider
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {canPayWithMercadoPago ? (
              <div className="flex flex-col gap-3">
                <Link
                  href={data.checkout.mercadoPagoInitPoint!}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                >
                  Pagar con Mercado Pago
                </Link>
                <Link
                  href="/rider"
                  className="inline-flex items-center justify-center rounded-lg border border-primary/25 bg-white px-5 py-3 text-sm font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  Volver a Rider
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <AlertBanner tone="info" title="El pago ya fue procesado o no está disponible">
                  Este recibo de pago ya ha sido procesado o se encuentra expirado. Puedes regresar al menú principal.
                </AlertBanner>
                <Link
                  href="/rider"
                  className="inline-flex items-center justify-center rounded-lg border border-primary/25 bg-white px-5 py-3 text-sm font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  Volver a Rider
                </Link>
              </div>
            )}

            {/* Panel de simulación (siempre disponible en modo demo, pero oculto en acordeón) */}
            {data.isDemoMode && data.checkout.status === "CREATED" && (
              <details className="border-t border-slate-100 pt-4 mt-6">
                <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none select-none">
                  Simulador de Respuestas (Uso Exclusivo de Demo)
                </summary>
                <div className="mt-4 space-y-4 text-left">
                  <AlertBanner tone="warning" title="Modo Simulado Activo">
                    Dado que Mercado Pago no está completamente activo en este entorno de prueba, utiliza los botones de abajo para simular los diferentes estados de la transacción.
                  </AlertBanner>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "PAID")}>
                      <button type="submit" className="w-full rounded-lg bg-success-emerald px-4 py-3 text-sm font-semibold text-white transition hover:bg-success-emerald/90 cursor-pointer">
                        Simular Pago Aprobado (PAID)
                      </button>
                    </form>
                    <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "DENIED")}>
                      <button type="submit" className="w-full rounded-lg bg-error-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-error-red/90 cursor-pointer">
                        Simular Pago Rechazado (DENIED)
                      </button>
                    </form>
                    <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "CANCELED")}>
                      <button type="submit" className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover cursor-pointer">
                        Simular Pago Cancelado (CANCELED)
                      </button>
                    </form>
                    <form action={resolveDemoCheckoutAction.bind(null, checkoutId, "EXPIRED")}>
                      <button type="submit" className="w-full rounded-lg border border-primary/25 bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5 hover:border-primary/50 cursor-pointer">
                        Simular Pago Expirado (EXPIRED)
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            )}
          </div>
        )}
      </SectionCard>
    </CheckoutLayout>
  );
}
