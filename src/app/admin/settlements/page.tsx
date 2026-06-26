import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
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
  const [authContext, params, completedCount, pendingCount] = await Promise.all([
    requirePageRole(["admin"]),
    searchParams,
    prisma.settlement.count({ where: { status: "COMPLETED" } }),
    prisma.settlement.count({ where: { status: "PENDING" } }),
  ]);

  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Pagos a choferes"
      description="Gestiona y audita las transferencias de ganancias derivadas a los conductores."
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Pagos acreditados" value={String(completedCount)} description="Transferencias ya acreditadas con éxito." tone="emerald" />
          <MetricCard title="Pagos pendientes" value={String(pendingCount)} description="Transferencias aún pendientes de envío." tone="amber" />
        </div>

        {pendingCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-slate-900">Liquidaciones pendientes de pago</p>
                <p className="text-sm text-amber-700">Tenés {pendingCount} {pendingCount === 1 ? "liquidación pendiente" : "liquidaciones pendientes"} de transferir a los choferes.</p>
              </div>
            </div>
            <a
              href="#registros-tabla"
              className="rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition text-center shrink-0 cursor-pointer"
            >
              Ver liquidaciones
            </a>
          </div>
        )}

        <SectionCard id="registros-tabla">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Transferencias registradas</h2>
              <p className="mt-2 text-sm text-slate-600">Busca por viaje o conductor para auditar una transferencia puntual.</p>
            </div>
            <div className="flex items-center gap-3">
              <TableReportButtons role="admin" section="settlements" />
            </div>
          </div>

          <div className="mt-5">
            <Search placeholder="Buscar por viaje o conductor..." />
          </div>

          <Suspense fallback={<TableSkeleton />}>
            <SettlementsListSection q={q} page={page} />
          </Suspense>
        </SectionCard>
      </div>
    </AppShell>
  );
}

/**
 * Shimmer Table Skeleton loader for settlements
 */
function TableSkeleton() {
  return (
    <div className="space-y-4 mt-6 animate-pulse">
      {/* Mobile skeleton */}
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-outline-custom bg-surface p-4 h-28">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden lg:block border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div className="bg-slate-50 h-10 border-b border-slate-200 flex items-center px-4 justify-between">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
          <div className="h-3 w-28 bg-slate-200 rounded"></div>
          <div className="h-3 w-20 bg-slate-200 rounded"></div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 flex items-center px-4 justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/3"></div>
              </div>
              <div className="h-4 bg-slate-200 rounded w-16"></div>
              <div className="h-4 bg-slate-100 rounded w-20"></div>
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="h-8 bg-slate-200 rounded-full w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function SettlementsListSection({ q, page }: { q: string; page: number }) {
  const where: Prisma.SettlementWhereInput = q
    ? {
        OR: [
          { poolId: { contains: q, mode: "insensitive" } },
          { driverUserId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [settlements, totalSettlements] = await Promise.all([
    prisma.settlement.findMany({
      where,
      include: { payoutAccount: true },
      orderBy: [{ status: "asc" }, { settledAt: "desc" }, { id: "desc" }], // Order PENDING first
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.settlement.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalSettlements / PAGE_SIZE));

  if (settlements.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState title="No hay liquidaciones para este filtro" description="Prueba con otro término o elimina la búsqueda para ver el historial completo." />
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex justify-end">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {totalSettlements} registros
        </span>
      </div>

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

      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
        <Pagination totalPages={totalPages} />
      </div>
    </>
  );
}
