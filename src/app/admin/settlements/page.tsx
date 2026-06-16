import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
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
  const authContext = await requirePageRole(["admin"]);
  const params = await searchParams;
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
      title="Liquidaciones"
      description="Controla transferencias a conductores con una vista clara para contar que ya se liquido y que sigue pendiente."
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Registros visibles" value={String(totalSettlements)} description="Cantidad de liquidaciones para el filtro actual." tone="sky" />
          <MetricCard title="Completadas" value={String(completedCount)} description="Liquidaciones ya ejecutadas en el sistema." tone="emerald" />
          <MetricCard title="Pendientes" value={String(pendingCount)} description="Transferencias aun no completadas." tone="amber" />
        </div>

        <SectionCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Liquidaciones registradas</h2>
              <p className="mt-2 text-sm text-slate-600">Busca por pool o conductor para auditar rapidamente una transferencia puntual.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {totalSettlements} registros
            </span>
          </div>

          <div className="mt-5">
            <Search placeholder="Buscar por pool o conductor..." />
          </div>

          {settlements.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No hay liquidaciones para este filtro" description="Prueba con otro conductor o elimina la busqueda para recuperar el historial completo." />
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 lg:hidden">
                {settlements.map((settlement) => (
                  <article key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Pool {settlement.poolId}</p>
                        <p className="mt-1 text-xs text-slate-500">Conductor {settlement.driverUserId}</p>
                      </div>
                      <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <p>Monto: <span className="font-semibold text-slate-900">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</span></p>
                      <p>Fecha: {settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente"}</p>
                      <p>Cuenta: {settlement.payoutAccount?.alias ?? settlement.payoutAccount?.accountReference ?? "Sin cuenta asociada"}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <caption className="sr-only">Liquidaciones registradas</caption>
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Pool</th>
                      <th className="px-4 py-3 font-semibold">Conductor</th>
                      <th className="px-4 py-3 font-semibold">Monto</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Cuenta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                    {settlements.map((settlement) => (
                      <tr key={settlement.id}>
                        <td className="px-4 py-4 align-top font-medium text-slate-900">{settlement.poolId}</td>
                        <td className="px-4 py-4 align-top text-sm text-slate-600">{settlement.driverUserId}</td>
                        <td className="px-4 py-4 align-top font-medium text-slate-900">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</td>
                        <td className="px-4 py-4 align-top">
                          <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                          <p className="mt-2 text-xs text-slate-500">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente"}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-slate-500">
                          {settlement.payoutAccount ? (
                            <>
                              <p className="break-all text-slate-700">{settlement.payoutAccount.accountReference}</p>
                              <p className="mt-1">{settlement.payoutAccount.alias ?? "Sin alias"}</p>
                            </>
                          ) : (
                            <span>Sin cuenta asociada</span>
                          )}
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
