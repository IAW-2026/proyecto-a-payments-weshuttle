import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getDriverSettlementsData, getDriverTripsData, getDriverSummaryData, parseDriverPage } from "../driver-data";
import { DriverHero, DriverSummaryMetrics } from "../driver-ui";
import { TableReportButtons } from "@/components/table-report-buttons";

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function DriverTripsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["driver"]);
  const params = await searchParams;
  const activeTab = params.tab === "cobros" ? "cobros" : "viajes";
  const q = params.q?.trim() ?? "";
  const page = parseDriverPage(params.page);

  // Fetch data for the driver
  const [summaryData, trips, settlementsData] = await Promise.all([
    getDriverSummaryData(authContext.clerkUserId),
    getDriverTripsData(authContext.clerkUserId),
    getDriverSettlementsData(authContext.clerkUserId, q, page),
  ]);

  return (
    <AppShell
      role="driver"
      clerkUserId={authContext.clerkUserId}
      title="Viajes y ganancias"
      description="Consultá tus viajes realizados y los pagos depositados en tu cuenta."
    >
      <div className="flex flex-col gap-8">
        <DriverHero
          title="Historial de viajes y cobros"
          description="Acá podés seguir en detalle la actividad de tus viajes y ver el estado de las transferencias enviadas a tu cuenta."
        />

        <DriverSummaryMetrics
          settledAmount={formatMoney(summaryData.settledAmount, "ARS")}
          payoutAccountLabel={summaryData.payoutAccount?.alias ?? summaryData.payoutAccount?.accountReference ?? "Sin configurar"}
          payoutStatus={
            <StatusBadge
              value={summaryData.payoutAccount?.status ?? "INACTIVE"}
              label={summaryData.payoutAccount ? (summaryData.payoutAccount.status === "ACTIVE" ? "Activa" : "Inactiva") : "Pendiente"}
              rounded="lg"
            />
          }
          completedSettlements={summaryData.completedSettlements}
          pendingSettlements={summaryData.pendingSettlements}
        />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200">
          <Link
            href={`/driver/trips?tab=viajes${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`flex-1 pb-4 text-center border-b-2 font-medium text-sm transition-colors ${
              activeTab === "viajes"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            Viajes realizados ({trips.length})
          </Link>
          <Link
            href={`/driver/trips?tab=cobros${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`flex-1 pb-4 text-center border-b-2 font-medium text-sm transition-colors ${
              activeTab === "cobros"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            Cobros recibidos ({settlementsData.totalSettlements})
          </Link>
        </div>

        {activeTab === "viajes" ? (
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Tus viajes completados</h3>
                <p className="mt-2 text-sm text-slate-600">Este es el listado de viajes realizados y el estado de cobro de sus tarifas.</p>
              </div>
              <TableReportButtons role="driver" section="trips" />
            </div>

            {trips.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Aún no tienes viajes registrados"
                  description="Cuando realices viajes y se registren sus correspondientes cobros, aparecerán detallados en esta sección."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {trips.map((trip) => (
                  <article key={trip.id} className="rounded-xl border border-outline-custom bg-white p-5 shadow-xs transition hover:border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Viaje realizado</h4>
                          <p className="text-xs text-slate-500">
                            {trip.settledAt ? `Completado el ${formatDateTime(trip.settledAt)}` : "Viaje finalizado en proceso de pago"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-bold text-slate-900">{formatMoney(trip.amount.toNumber(), trip.currency)}</p>
                          <p className="text-xs text-slate-500">Ganancia estimada</p>
                        </div>
                        <StatusBadge value={trip.status} label={trip.status === "COMPLETED" ? "Cobrado" : "Pendiente"} rounded="lg" />
                      </div>
                    </div>
                    <details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 cursor-pointer hover:text-slate-800">
                      <summary className="font-medium select-none">Ver detalles técnicos</summary>
                      <div className="mt-2 space-y-1 pl-2 font-mono bg-slate-50 p-2 rounded-lg text-[10px]">
                        <p>ID de viaje (Pool): {trip.poolId}</p>
                        <p>ID de cobro (Settlement): {trip.id}</p>
                        <p>Cuenta destino de cobro: {trip.payoutReference ?? "No configurada"}</p>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Historial de transferencias</h3>
                <p className="mt-2 text-sm text-slate-600">Buscá y consultá los pagos individuales que te hemos transferido.</p>
              </div>
              <div className="flex items-center gap-3">
                <TableReportButtons role="driver" section="settlements" />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {settlementsData.totalSettlements} registros
                </span>
              </div>
            </div>

            <div className="mt-5">
              <Search placeholder="Buscar cobros por identificador..." />
            </div>

            {settlementsData.settlements.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No se encontraron transferencias"
                  description="Probá buscando con otro código o limpiá el buscador para ver la lista completa."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {settlementsData.settlements.map((settlement) => (
                  <article key={settlement.id} className="rounded-xl border border-outline-custom bg-white p-5 shadow-xs transition hover:border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Cobro por viaje</h4>
                          <p className="text-xs text-slate-500">
                            {settlement.settledAt ? `Acreditado el ${formatDateTime(settlement.settledAt)}` : "Pago pendiente de transferencia"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-bold text-slate-900">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                          <p className="text-xs text-slate-500">Monto depositado</p>
                        </div>
                        <StatusBadge value={settlement.status} label={settlement.status === "COMPLETED" ? "Acreditado" : "Pendiente"} rounded="lg" />
                      </div>
                    </div>
                    <details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 cursor-pointer hover:text-slate-800">
                      <summary className="font-medium select-none">Ver detalles técnicos</summary>
                      <div className="mt-2 space-y-1 pl-2 font-mono bg-slate-50 p-2 rounded-lg text-[10px]">
                        <p>ID de pago: {settlement.id}</p>
                        <p>ID de viaje (Pool): {settlement.poolId}</p>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-600">
              <Pagination totalPages={settlementsData.totalPages} />
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
