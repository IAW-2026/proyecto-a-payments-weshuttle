import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDemoCheckoutAction } from "../actions";
import { RiderField, RiderHero } from "../rider-ui";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
    reservation_id?: string;
  }>;
};

export default async function RiderCheckoutDemoPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["rider"]);
  const params = await searchParams;
  const riderAppUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const defaultSuccessUrl = riderAppUrl ? `${riderAppUrl.replace(/\/$/, "")}?payment=success` : "/rider?payment=success";
  const defaultFailureUrl = riderAppUrl ? `${riderAppUrl.replace(/\/$/, "")}?payment=failure` : "/rider?payment=failure";
  const defaultPendingUrl = riderAppUrl ? `${riderAppUrl.replace(/\/$/, "")}?payment=pending` : "/rider?payment=pending";

  const latestCheckout = await prisma.checkoutSession.findFirst({
    where: {
      reservationId: {
        startsWith: "res_demo_new_",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let nextReservationId = "res_demo_new_1";
  if (latestCheckout) {
    const numPart = latestCheckout.reservationId.replace("res_demo_new_", "");
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      nextReservationId = `res_demo_new_${parsed + 1}`;
    } else {
      nextReservationId = `res_demo_new_${latestCheckout.id.length + 1}`;
    }
  }

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Simular Nuevo Viaje" description="Genera una reserva de prueba para simular y mostrar el flujo de pagos.">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <RiderHero title="Genera un viaje de prueba en un clic." description="Se creará una reserva ficticia con valores seguros por defecto para que puedas iniciar y probar el flujo de pagos." />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <form action={createDemoCheckoutAction} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Detalles del viaje a simular</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex justify-between border-b border-slate-200/50 pb-2">
                <span>Servicio:</span>
                <span className="font-semibold text-slate-900">Traslado Industrial WeShuttle</span>
              </li>
              <li className="flex justify-between border-b border-slate-200/50 pb-2">
                <span>Monto a cobrar:</span>
                <span className="font-semibold text-slate-900">$5.800,00 ARS</span>
              </li>
              <li className="flex justify-between">
                <span>Pasarela de Pago:</span>
                <span className="font-semibold text-slate-900">Mercado Pago (Simulado)</span>
              </li>
            </ul>
          </div>

          <button type="submit" className="w-full rounded-full bg-sky-500 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/15 hover:bg-sky-400 hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer">
            Generar Reserva de Prueba
          </button>

          <details className="border-t border-slate-100 pt-4">
            <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none select-none">
              Opciones Avanzadas (Parámetros Técnicos)
            </summary>
            <div className="grid gap-4 mt-4 sm:grid-cols-2 text-left">
              <RiderField label="ID de reserva" name="reservationId" defaultValue={params.reservation_id || nextReservationId} placeholder={nextReservationId} />
              <RiderField label="ID del pool" name="poolId" defaultValue="pool_demo_checkout_new" placeholder="pool_demo_checkout_new" />
              <RiderField label="Precio maximo" name="maxPrice" type="number" defaultValue="5800" placeholder="5800" helpText="Monto tope que el usuario acepto para la reserva." />
              <RiderField label="Moneda" name="currency" defaultValue="ARS" placeholder="ARS" />
              <RiderField label="URL de exito" name="successUrl" defaultValue={defaultSuccessUrl} placeholder={defaultSuccessUrl} helpText="Se usa al volver desde Mercado Pago o desde la simulacion de demo." />
              <RiderField label="URL de error" name="failureUrl" defaultValue={defaultFailureUrl} placeholder={defaultFailureUrl} />
              <RiderField label="URL pendiente" name="pendingUrl" defaultValue={defaultPendingUrl} placeholder={defaultPendingUrl} />
            </div>
          </details>
        </form>
      </div>
    </AppShell>
  );
}
