import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData } from "../rider-data";
import { RiderHero } from "../rider-ui";

type PageProps = {
  searchParams: Promise<{
    reservation_id?: string;
  }>;
};

export default async function RiderReservationsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["rider"]);
  const params = await searchParams;
  const data = await getRiderPageData(authContext.clerkUserId, params.reservation_id);

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Detalle de reserva" description="Consulta una reserva para explicar checkout, cobro y credito sin mezclar todo en la misma pantalla.">
      <div className="flex flex-col gap-8">
        <RiderHero title="Consulta una reserva puntual." description="Esta vista relaciona el estado del checkout y el resultado del cobro asociado para una reserva del rider." />

        <SectionCard>
          <h3 className="text-xl font-semibold text-slate-900">Buscar reserva</h3>
          <p className="mt-2 text-sm text-slate-600">Ingresa el ID para ver el detalle del checkout y del cargo asociado.</p>

          <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="reservation_id" className="sr-only">ID de reserva</label>
            <input
              id="reservation_id"
              name="reservation_id"
              defaultValue={data.reservationId}
              placeholder="res_paid_001"
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Consultar reserva
            </button>
          </form>

          {!data.reservationId ? (
            <div className="mt-6">
              <EmptyState title="Ingresa una reserva para continuar" description="Al consultar una reserva veras el estado del checkout, el monto cobrado y si hubo credito aplicado o generado." />
            </div>
          ) : !data.latestCheckout && !data.latestCharge ? (
            <div className="mt-6">
              <AlertBanner tone="warning">No se encontro informacion asociada a esa reserva para tu usuario.</AlertBanner>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {data.latestCheckout ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Resumen del checkout</h4>
                      <p className="mt-1 text-sm text-slate-600">Lo que el usuario ve antes de ser derivado a Mercado Pago.</p>
                    </div>
                    <StatusBadge value={data.latestCheckout.status} label={humanizeStatus(data.latestCheckout.status)} />
                  </div>

                  <dl className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <div><dt className="font-semibold text-slate-900">Checkout</dt><dd className="mt-1 break-all">{data.latestCheckout.id}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Expira</dt><dd className="mt-1">{formatDateTime(data.latestCheckout.expiresAt)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Precio maximo</dt><dd className="mt-1">{formatMoney(Number(data.latestCheckout.maxPrice), data.latestCheckout.currency)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Total a cobrar</dt><dd className="mt-1">{formatMoney(Number(data.latestCheckout.amountToCharge), data.latestCheckout.currency)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Credito aplicado</dt><dd className="mt-1">{formatMoney(Number(data.latestCheckout.creditApplied), data.latestCheckout.currency)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Preference / URL</dt><dd className="mt-1 break-all">{data.latestCheckout.checkoutUrl ?? "No disponible"}</dd></div>
                  </dl>

                  <Link href={`/checkout/${data.latestCheckout.id}`} className="mt-5 inline-flex items-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
                    Abrir resumen del checkout
                  </Link>
                </div>
              ) : null}

              {data.latestCharge ? (
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Resultado del cobro</h4>
                      <p className="mt-1 text-sm text-slate-600">Este bloque muestra como termino el pago y su impacto sobre el viaje.</p>
                    </div>
                    <StatusBadge value={data.latestCharge.status} label={humanizeStatus(data.latestCharge.status)} />
                  </div>

                  <dl className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <div><dt className="font-semibold text-slate-900">Monto cobrado</dt><dd className="mt-1">{formatMoney(Number(data.latestCharge.amountCharged), data.latestCharge.currency)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Credito aplicado</dt><dd className="mt-1">{formatMoney(Number(data.latestCharge.creditApplied), data.latestCharge.currency)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Precio final del viaje</dt><dd className="mt-1">{data.latestCharge.finalTripPrice !== null ? formatMoney(Number(data.latestCharge.finalTripPrice), data.latestCharge.currency) : "Pendiente"}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Credito generado</dt><dd className="mt-1">{formatMoney(Number(data.latestCharge.creditGranted), data.latestCharge.currency)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Procesado</dt><dd className="mt-1">{formatDateTime(data.latestCharge.processedAt)}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Transaccion</dt><dd className="mt-1 break-all">{data.latestCharge.transactionId}</dd></div>
                    <div className="sm:col-span-2"><dt className="font-semibold text-slate-900">Motivo de rechazo</dt><dd className="mt-1">{data.latestCharge.rejectionReason ?? "Sin rechazo"}</dd></div>
                  </dl>
                </div>
              ) : (
                <EmptyState title="El cobro aun no se registro" description="Puede tratarse de un checkout cancelado, expirado o todavia pendiente de confirmacion." />
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
