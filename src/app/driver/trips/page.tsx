import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getDriverSettlementsData, parseDriverPage } from "../driver-data";
import { DriverHero } from "../driver-ui";
import { TableReportButtons } from "@/components/table-report-buttons";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function DriverTripsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["driver"]);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parseDriverPage(params.page);

  return (
    <AppShell
      role="driver"
      clerkUserId={authContext.clerkUserId}
      title=""
      description=""
    >
      <div className="flex flex-col gap-8">
        <DriverHero
          title="Viajes y ganancias"
          description="Consultá el detalle de cada viaje completado y el cobro que recibiste por cada uno."
        />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <Suspense fallback={<ListSkeleton count={5} />}>
          <DriverUnifiedTripsSection clerkUserId={authContext.clerkUserId} q={q} page={page} />
        </Suspense>
      </div>
    </AppShell>
  );
}

/**
 * Shimmer loader skeleton
 */
function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-outline-custom bg-white p-5 h-24">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function DriverUnifiedTripsSection({
  clerkUserId,
  q,
  page,
}: {
  clerkUserId: string;
  q: string;
  page: number;
}) {
  const data = await getDriverSettlementsData(clerkUserId, q, page);

  return (
    <SectionCard>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Mis viajes y cobros</h3>
          <p className="mt-1 text-sm text-slate-600">
            Cada fila representa un viaje completado junto con el cobro que recibiste por él.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TableReportButtons role="driver" section="settlements" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {data.totalSettlements} {data.totalSettlements === 1 ? "viaje" : "viajes"}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="mt-5">
        <Search placeholder="Buscar por ID de pool..." />
      </div>

      {/* List */}
      {data.settlements.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={q ? "Sin resultados para esa búsqueda" : "Aún no tenés viajes registrados"}
            description={
              q
                ? "Probá buscando con otro ID de pool o limpiá el buscador para ver la lista completa."
                : "Cuando completes viajes y se procesen los cobros, aparecerán aquí con todos sus detalles."
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {data.settlements.map((settlement) => {
            const payoutLabel =
              settlement.payoutAccount?.alias ??
              settlement.payoutAccount?.accountReference ??
              "No configurada";

            const statusLabel =
              settlement.status === "COMPLETED"
                ? "Acreditado"
                : settlement.status === "PENDING"
                  ? "Pendiente"
                  : "Fallido";

            return (
              <article
                key={settlement.id}
                className="rounded-xl border border-outline-custom bg-white shadow-xs transition-all duration-200 hover:border-primary/25 hover:shadow-sm"
              >
                {/* Main row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                  {/* Left: icon + date */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        settlement.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-600"
                          : settlement.status === "PENDING"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      {settlement.status === "COMPLETED" ? (
                        /* check-circle icon */
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : settlement.status === "PENDING" ? (
                        /* clock icon */
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        /* x-circle icon */
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900">Viaje completado</h4>
                      <p className="text-xs text-slate-500">
                        {settlement.settledAt
                          ? `Acreditado el ${formatDateTime(settlement.settledAt)}`
                          : "Cobro en proceso"}
                      </p>
                    </div>
                  </div>

                  {/* Right: amount + status */}
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatMoney(settlement.amount.toNumber(), settlement.currency)}
                      </p>
                      <p className="text-xs text-slate-500">Cobro neto acreditado</p>
                    </div>
                    <StatusBadge value={settlement.status} label={statusLabel} rounded="lg" />
                  </div>
                </div>

                {/* Expandible details */}
                <details className="border-t border-slate-100 group">
                  <summary className="flex cursor-pointer select-none items-center gap-1.5 px-5 py-3 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 list-none">
                    <svg
                      className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Ver detalle del cobro
                  </summary>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 pb-5 pt-2">
                    <div className="rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ID de Pool</p>
                      <p className="mt-1 font-mono text-xs text-slate-700 break-all">{settlement.poolId ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cuenta destino</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">{payoutLabel}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha de acreditación</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente"}
                      </p>
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="mt-6">
          <Pagination totalPages={data.totalPages} />
        </div>
      )}
    </SectionCard>
  );
}
