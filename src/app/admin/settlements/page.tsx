import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { AdminHero } from "../admin-ui";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminSettlementsPage({ searchParams }: PageProps) {
  const [authContext, params] = await Promise.all([
    requirePageRole(["admin"]),
    searchParams,
  ]);
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);
  const where: Prisma.SettlementWhereInput = q
    ? {
        OR: [
          { poolId: { contains: q, mode: "insensitive" } },
          { driverUserId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const [settlements, totalSettlements, completedCount, pendingCount] = await Promise.all([
    prisma.settlement.findMany({
      where,
      include: { payoutAccount: true },
      orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.settlement.count({ where }),
    prisma.settlement.count({ where: { status: "COMPLETED" } }),
    prisma.settlement.count({ where: { status: "PENDING" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalSettlements / PAGE_SIZE));

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Pagos a choferes"
      description="Gestiona y audita las transferencias de ganancias derivadas a los conductores."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Liquidaciones y pagos a conductores" description="Sigue de cerca las transferencias enviadas o pendientes de acreditación de los choferes por los viajes realizados." />

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Transferencias encontradas" value={String(totalSettlements)} description="Cantidad de liquidaciones con el filtro actual." tone="sky" />
          <MetricCard title="Pagos acreditados" value={String(completedCount)} description="Transferencias ya acreditadas con éxito." tone="emerald" />
          <MetricCard title="Pagos pendientes" value={String(pendingCount)} description="Transferencias aún pendientes de envío." tone="amber" />
        </div>

        <SectionCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Transferencias registradas</h2>
              <p className="mt-2 text-sm text-slate-600">Busca por viaje o conductor para auditar una transferencia puntual.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {totalSettlements} registros
            </span>
          </div>

          <div className="mt-5">
            <Search placeholder="Buscar por viaje o conductor..." />
          </div>

          {settlements.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No hay liquidaciones para este filtro" description="Prueba con otro término o elimina la búsqueda para ver el historial completo." />
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 lg:hidden">
                {settlements.map((settlement) => (
                  <article key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Pago a Chofer</p>
                        <p className="mt-1 text-sm text-slate-600">Monto: <span className="font-semibold text-slate-900">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</span></p>
                      </div>
                      <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                    </div>
                    <div className="mt-3">
                      <details className="text-xs text-slate-400">
                        <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                        <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                          <p>Chofer: <span className="font-mono">{settlement.driverUserId}</span></p>
                          <p>ID Pool (Viaje): <span className="font-mono">{settlement.poolId}</span></p>
                          <p>ID Liquidación: <span className="font-mono">{settlement.id}</span></p>
                          <p>Fecha pago: {settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente de acreditar"}</p>
                          <p>Cuenta de destino: {settlement.payoutAccount?.alias ?? settlement.payoutAccount?.accountReference ?? "Sin cuenta asociada"}</p>
                        </div>
                      </details>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <caption className="sr-only">Liquidaciones registradas</caption>
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Chofer / Destinatario</th>
                      <th className="px-4 py-3 font-semibold">Monto</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Cuenta de destino</th>
                      <th className="px-4 py-3 font-semibold">Detalle Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                    {settlements.map((settlement) => (
                      <tr key={settlement.id}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-slate-900">Chofer</p>
                          <p className="mt-1 text-xs text-slate-500 truncate max-w-[200px]" title={settlement.driverUserId}>{settlement.driverUserId}</p>
                        </td>
                        <td className="px-4 py-4 align-top font-medium text-slate-900">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</td>
                        <td className="px-4 py-4 align-top">
                          <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                          <p className="mt-1 text-xs text-slate-500">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente de acreditar"}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-slate-600 font-medium">
                          {settlement.payoutAccount ? (
                            <>
                              <p className="text-slate-800">{settlement.payoutAccount.alias ?? "Sin alias"}</p>
                              <p className="mt-1 text-slate-400 font-mono text-[10px] truncate max-w-[240px]">{settlement.payoutAccount.accountReference}</p>
                            </>
                          ) : (
                            <span className="text-slate-400">Sin cuenta asociada</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-slate-500">
                          <details className="text-xs text-slate-400">
                            <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver códigos</summary>
                            <div className="mt-2 space-y-1 bg-slate-50 p-2 rounded border border-slate-200 text-slate-600 max-w-[240px]">
                              <p className="truncate">ID Liquidación: {settlement.id}</p>
                              <p className="truncate">ID Pool (Viaje): {settlement.poolId}</p>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
            <Pagination totalPages={totalPages} />
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
