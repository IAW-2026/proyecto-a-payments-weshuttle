import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getDriverSettlementsData, parseDriverPage } from "../driver-data";
import { DriverHero } from "../driver-ui";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function DriverSettlementsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["driver"]);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parseDriverPage(params.page);
  const data = await getDriverSettlementsData(authContext.clerkUserId, q, page);

  return (
    <AppShell role="driver" clerkUserId={authContext.clerkUserId} title="Liquidaciones" description="Busca por pool y revisa el estado de las transferencias del conductor.">
      <div className="flex flex-col gap-8">
        <DriverHero title="Explica si cada viaje ya fue liquidado." description="La logica sigue siendo la misma; esta pantalla solo separa la parte operativa para que la demo sea mas ordenada." />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <SectionCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Liquidaciones</h3>
              <p className="mt-2 text-sm text-slate-600">Busca por pool para ubicar rapidamente un viaje y explicar si ya fue liquidado o sigue pendiente.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {data.totalSettlements} registros
            </span>
          </div>

          <div className="mt-5">
            <Search placeholder="Buscar por pool..." />
          </div>

          {data.settlements.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No hay liquidaciones para este filtro" description="Prueba con otro pool o elimina la busqueda para volver a ver el historial completo del conductor." />
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 md:hidden">
                {data.settlements.map((settlement) => (
                  <article key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Pool {settlement.poolId}</p>
                        <p className="mt-1 text-sm text-slate-600">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                      </div>
                      <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Aun no se registro fecha de liquidacion"}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <caption className="sr-only">Liquidaciones del conductor</caption>
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Pool</th>
                      <th className="px-4 py-3 font-semibold">Monto</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                    {data.settlements.map((settlement) => (
                      <tr key={settlement.id}>
                        <td className="px-4 py-4 align-top font-medium text-slate-900">{settlement.poolId}</td>
                        <td className="px-4 py-4 align-top">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</td>
                        <td className="px-4 py-4 align-top">
                          <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                        </td>
                        <td className="px-4 py-4 align-top">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
            <Pagination totalPages={data.totalPages} />
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
