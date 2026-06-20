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
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Buscar Pago de Viaje" description="Consulta el estado de cobro y saldo aplicado a tu viaje ingresando el código.">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <RiderHero title="Consulta el estado de tu viaje." description="Aquí puedes buscar cualquier viaje por su código para revisar cuánto pagaste y si se aplicó saldo a favor." />

        <SectionCard>
          <h3 className="text-lg font-bold text-slate-900">Buscar por código de viaje</h3>
          <p className="mt-1 text-xs text-slate-500">Ingresa el código identificador de tu viaje (ej. res_paid_001).</p>

          <form method="get" className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="reservation_id" className="sr-only">Código de viaje</label>
            <input
              id="reservation_id"
              name="reservation_id"
              defaultValue={data.reservationId}
              placeholder="res_paid_001"
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <button type="submit" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition cursor-pointer">
              Consultar Viaje
            </button>
          </form>

          {!data.reservationId ? (
            <div className="mt-6">
              <EmptyState title="Ingresa un código para continuar" description="Al consultar un código verás el desglose del pago y el saldo aplicado." />
            </div>
          ) : !data.latestCheckout && !data.latestCharge ? (
            <div className="mt-6">
              <AlertBanner tone="warning">No encontramos ningún pago o viaje registrado con ese código.</AlertBanner>
            </div>
          ) : (
            <div className="mt-6 space-y-6">

              {/* Resumen del Pago */}
              {data.latestCheckout ? (
                <div className="rounded-xl border border-outline-custom bg-surface p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/50 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Resumen del Pago</h4>
                      <p className="mt-0.5 text-xs text-slate-500">Información de facturación previa al pago.</p>
                    </div>
                    <StatusBadge value={data.latestCheckout.status} label={humanizeStatus(data.latestCheckout.status)} />
                  </div>

                  <dl className="mt-4 space-y-2.5 text-sm text-slate-600">
                    <div className="flex justify-between"><dt className="font-medium">Tarifa base máxima:</dt><dd className="font-bold text-slate-900">{formatMoney(Number(data.latestCheckout.maxPrice), data.latestCheckout.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="font-medium">Saldo a favor utilizado:</dt><dd className="font-bold text-slate-900 text-sky-700">-{formatMoney(Number(data.latestCheckout.creditApplied), data.latestCheckout.currency)}</dd></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2.5"><dt className="font-bold text-slate-950">Total a pagar:</dt><dd className="font-extrabold text-slate-950 text-base">{formatMoney(Number(data.latestCheckout.amountToCharge), data.latestCheckout.currency)}</dd></div>
                  </dl>

                  <div className="mt-4 flex flex-col gap-3">
                    <Link href={`/checkout/${data.latestCheckout.id}`} className="inline-flex justify-center items-center rounded-full bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition">
                      Ver Recibo de Pago
                    </Link>

                    <details className="border-t border-slate-200/60 pt-3 mt-1">
                      <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none">
                        Detalles técnicos de auditoría
                      </summary>
                      <dl className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                        <div><dt className="font-semibold">Código de Pago (ID):</dt><dd className="mt-0.5 break-all">{data.latestCheckout.id}</dd></div>
                        <div><dt className="font-semibold">Expiración:</dt><dd className="mt-0.5">{formatDateTime(data.latestCheckout.expiresAt)}</dd></div>
                        <div><dt className="font-semibold">Preferencia MP:</dt><dd className="mt-0.5 break-all">{data.latestCheckout.checkoutUrl ?? "No disponible"}</dd></div>
                      </dl>
                    </details>
                  </div>
                </div>
              ) : null}

              {/* Resultado del Cobro */}
              {data.latestCharge ? (
                <div className="rounded-xl border border-outline-custom bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/50 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Resultado del Cobro</h4>
                      <p className="mt-0.5 text-xs text-slate-500">Transacción final una vez completado el viaje.</p>
                    </div>
                    <StatusBadge value={data.latestCharge.status} label={humanizeStatus(data.latestCharge.status)} />
                  </div>

                  {data.latestCharge.status === "DENIED" && (
                    <div className="mt-3">
                      <AlertBanner tone="danger" title="El pago fue rechazado">
                        Motivo: {data.latestCharge.rejectionReason ?? "Problemas con el medio de pago."} Por favor, intenta nuevamente desde la pantalla de pago.
                      </AlertBanner>
                    </div>
                  )}

                  <dl className="mt-4 space-y-2.5 text-sm text-slate-600">
                    <div className="flex justify-between"><dt className="font-medium">Monto abonado:</dt><dd className="font-bold text-slate-900">{formatMoney(Number(data.latestCharge.amountCharged), data.latestCharge.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="font-medium">Saldo a favor utilizado:</dt><dd className="font-bold text-slate-900 text-sky-700">-{formatMoney(Number(data.latestCharge.creditApplied), data.latestCharge.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="font-medium">Tarifa final de viaje:</dt><dd className="font-bold text-slate-900">{data.latestCharge.finalTripPrice !== null ? formatMoney(Number(data.latestCharge.finalTripPrice), data.latestCharge.currency) : "Pendiente de cálculo final"}</dd></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-medium text-emerald-700">Nuevo saldo a favor generado:</dt><dd className="font-bold text-emerald-700">+{formatMoney(Number(data.latestCharge.creditGranted), data.latestCharge.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="font-medium">Fecha de pago:</dt><dd className="font-medium text-slate-700">{formatDateTime(data.latestCharge.processedAt)}</dd></div>
                  </dl>

                  <details className="border-t border-slate-100 pt-3 mt-4">
                    <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none">
                      Detalles técnicos de transacción
                    </summary>
                    <dl className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                      <div><dt className="font-semibold">ID Transacción:</dt><dd className="mt-0.5 break-all">{data.latestCharge.transactionId}</dd></div>
                      <div><dt className="font-semibold">Código de error:</dt><dd className="mt-0.5">{data.latestCharge.rejectionReason ?? "Ninguno"}</dd></div>
                    </dl>
                  </details>
                </div>
              ) : (
                <EmptyState title="El cobro aún no se procesó" description="El viaje puede estar planificado o pendiente de confirmación." />
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
