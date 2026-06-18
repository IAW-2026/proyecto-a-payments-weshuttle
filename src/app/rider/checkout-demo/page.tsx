import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { requirePageRole } from "@/lib/auth";
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

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Crear checkout de demo" description="Genera un checkout interno para mostrar el paso previo a Mercado Pago y el retorno posterior.">
      <div className="flex flex-col gap-8">
        <RiderHero title="Crea un checkout listo para la demo." description="Se mantiene exactamente la misma accion de backend; solo cambia la organizacion visual para que el flujo sea mas claro." />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <form action={createDemoCheckoutAction} className="grid gap-4 rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <RiderField label="ID de reserva" name="reservationId" defaultValue={params.reservation_id || "res_demo_new_001"} placeholder="res_demo_new_001" />
          <RiderField label="ID del pool" name="poolId" defaultValue="pool_demo_checkout_new" placeholder="pool_demo_checkout_new" />
          <RiderField label="Precio maximo" name="maxPrice" type="number" defaultValue="5800" placeholder="5800" helpText="Monto tope que el usuario acepto para la reserva." />
          <RiderField label="Moneda" name="currency" defaultValue="ARS" placeholder="ARS" />
          <RiderField label="URL de exito" name="successUrl" defaultValue={defaultSuccessUrl} placeholder={defaultSuccessUrl} helpText="Se usa al volver desde Mercado Pago o desde la simulacion de demo." />
          <RiderField label="URL de error" name="failureUrl" defaultValue={defaultFailureUrl} placeholder={defaultFailureUrl} />
          <RiderField label="URL pendiente" name="pendingUrl" defaultValue={defaultPendingUrl} placeholder={defaultPendingUrl} />
          <div className="sm:col-span-2">
            <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Crear checkout interno
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
