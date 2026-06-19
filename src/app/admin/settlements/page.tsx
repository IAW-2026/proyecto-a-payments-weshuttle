import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { AdminHero } from "../admin-ui";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettlementsClient } from "./settlements-client";
import { TableReportButtons } from "@/components/table-report-buttons";

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
      orderBy: [{ status: "asc" }, { settledAt: "desc" }, { id: "desc" }], // Order PENDING first so they are easily visible
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
            <div className="flex items-center gap-3">
              <TableReportButtons role="admin" section="settlements" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {totalSettlements} registros
              </span>
            </div>
          </div>

          <div className="mt-5">
            <Search placeholder="Buscar por viaje o conductor..." />
          </div>

          {settlements.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No hay liquidaciones para este filtro" description="Prueba con otro término o elimina la búsqueda para ver el historial completo." />
            </div>
          ) : (
            <SettlementsClient
              settlements={settlements.map((s) => ({
                id: s.id,
                poolId: s.poolId,
                driverUserId: s.driverUserId,
                payoutAccountId: s.payoutAccountId,
                amount: s.amount.toNumber(),
                currency: s.currency,
                status: s.status,
                settledAt: s.settledAt ? s.settledAt.toISOString() : null,
                payoutAccount: s.payoutAccount
                  ? {
                      id: s.payoutAccount.id,
                      driverUserId: s.payoutAccount.driverUserId,
                      provider: s.payoutAccount.provider,
                      accountReference: s.payoutAccount.accountReference,
                      alias: s.payoutAccount.alias,
                      status: s.payoutAccount.status,
                    }
                  : null,
              }))}
            />
          )}

          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
            <Pagination totalPages={totalPages} />
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
