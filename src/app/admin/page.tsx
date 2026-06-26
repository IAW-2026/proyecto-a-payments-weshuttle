import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const [
    authContext,
    totalCollectedData,
    totalSettledData,
    pendingSettlementsData,
  ] = await Promise.all([
    requirePageRole(["admin"]),
    prisma.charge.aggregate({
      _sum: { amountCharged: true },
      where: { status: "PAID" },
    }),
    prisma.settlement.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.settlement.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { status: "PENDING" },
    }),
  ]);

  const totalCollected = totalCollectedData._sum.amountCharged?.toNumber() || 0;
  const totalSettled = totalSettledData._sum.amount?.toNumber() || 0;
  const pendingAmount = pendingSettlementsData._sum.amount?.toNumber() || 0;
  const pendingCount = pendingSettlementsData._count.id || 0;

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title=""
      description=""
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total recaudado" value={formatMoney(totalCollected, "ARS")} description="Monto cobrado y acreditado con éxito." tone="emerald" />
          <MetricCard title="Pagado a choferes" value={formatMoney(totalSettled, "ARS")} description="Fondos ya transferidos a los conductores." tone="sky" />
          <MetricCard title="Pendiente a choferes" value={String(pendingCount)} description={`Pendiente de transferir: ${formatMoney(pendingAmount, "ARS")}`} tone="amber" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Últimos cobros aprobados</h3>
                <p className="mt-2 text-sm text-slate-600">Cobros acreditados recientemente a pasajeros.</p>
              </div>
              <Link href="/admin/checkouts" className="text-sm font-semibold text-primary hover:underline">
                Ver control de pagos
              </Link>
            </div>

            <div className="mt-6">
              <Suspense fallback={<ListSkeleton count={3} />}>
                <RecentChargesSection />
              </Suspense>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Cálculos de tarifas recientes</h3>
                <p className="mt-2 text-sm text-slate-600">Últimas tarifas finales definidas para viajes completados.</p>
              </div>
              <Link href="/admin/credits" className="text-sm font-semibold text-primary hover:underline">
                Ver ajustes de crédito
              </Link>
            </div>

            <div className="mt-6">
              <Suspense fallback={<ListSkeleton count={3} />}>
                <RecentPricingJobsSection />
              </Suspense>
            </div>
          </SectionCard>
        </div>

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Pagos recientes a choferes</h3>
              <p className="mt-2 text-sm text-slate-600">Ganancias transferidas recientemente a conductores.</p>
            </div>
            <Link href="/admin/settlements" className="text-sm font-semibold text-primary hover:underline">
              Ver pagos a choferes
            </Link>
          </div>

          <div className="mt-6">
            <Suspense fallback={<ListSkeleton count={3} />}>
              <RecentSettlementsSection />
            </Suspense>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

/**
 * Loading Placeholder for dashboard dynamic list sections
 */
function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-outline-custom bg-surface p-4 h-24">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentChargesSection() {
  const recentCharges = await prisma.charge.findMany({
    take: 5,
    orderBy: { processedAt: "desc" },
  });

  if (recentCharges.length === 0) {
    return <EmptyState title="Sin cobros recientes" description="Cuando ingresen pagos nuevos aparecerán aquí." />;
  }

  return (
    <div className="space-y-3">
      {recentCharges.map((charge) => (
        <div key={charge.id} className="rounded-xl border border-outline-custom bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Cobro aprobado</p>
              <p className="mt-1 text-sm text-slate-600">Monto total: {formatMoney(charge.amountCharged.toNumber(), charge.currency)}</p>
              <details className="mt-2 text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                  <p>ID Reserva: <span className="font-mono break-all">{charge.reservationId}</span></p>
                  <p>ID Pool: <span className="font-mono break-all">{charge.poolId}</span></p>
                  <p>ID Cobro: <span className="font-mono break-all">{charge.id}</span></p>
                  <p>Saldo aplicado: {formatMoney(charge.creditApplied.toNumber(), charge.currency)}</p>
                </div>
              </details>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusBadge value={charge.status} label={humanizeStatus(charge.status)} />
              <p className="text-xs text-slate-500">{formatDateTime(charge.processedAt)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentPricingJobsSection() {
  const recentFinalizationJobs = await prisma.poolPriceFinalizationJob.findMany({
    take: 5,
    orderBy: { startedAt: "desc" },
  });

  if (recentFinalizationJobs.length === 0) {
    return <EmptyState title="Sin procesos recientes" description="Cuando se calculen tarifas de viajes completados aparecerán aquí." />;
  }

  return (
    <div className="space-y-3">
      {recentFinalizationJobs.map((job) => (
        <div key={job.id} className="rounded-xl border border-outline-custom bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Tarifa final calculada</p>
              <p className="mt-1 text-sm text-slate-600">
                Monto final: {job.finalPrice !== null ? formatMoney(job.finalPrice.toNumber(), "ARS") : "Pendiente"}
              </p>
              <details className="mt-2 text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                  <p>ID Pool: <span className="font-mono break-all">{job.poolId}</span></p>
                  <p>ID Job: <span className="font-mono break-all">{job.id}</span></p>
                  <p>Motivo: {job.reason}</p>
                  <p>Ocupación: {job.currentPassengers} pasajeros</p>
                  <p>Precio base original: {formatMoney(job.basePrice.toNumber(), job.currency)}</p>
                </div>
              </details>
            </div>
            <div className="text-left sm:text-right">
              <StatusBadge value={job.status} />
              <p className="text-xs text-slate-500 mt-2">{formatDateTime(job.startedAt)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentSettlementsSection() {
  const recentSettlements = await prisma.settlement.findMany({
    take: 5,
    orderBy: { settledAt: "desc" },
  });

  if (recentSettlements.length === 0) {
    return <EmptyState title="Sin transferencias recientes" description="Los pagos completados aparecerán aquí." />;
  }

  return (
    <div className="space-y-3">
      {recentSettlements.map((settlement) => (
        <div key={settlement.id} className="rounded-xl border border-outline-custom bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Transferencia enviada</p>
              <p className="mt-1 text-sm text-slate-600">Monto: {formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
              <details className="mt-2 text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                  <p>ID Pool: <span className="font-mono break-all">{settlement.poolId}</span></p>
                  <p>ID Chofer: <span className="font-mono break-all">{settlement.driverUserId}</span></p>
                  <p>ID Transferencia: <span className="font-mono break-all">{settlement.id}</span></p>
                </div>
              </details>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
              <p className="text-xs text-slate-500">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
