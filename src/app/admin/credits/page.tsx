import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TableReportButtons } from "@/components/table-report-buttons";
import { getMockPoolIds, getPoolPassengers } from "@/lib/external-apis";
import { findApplicablePricingRule } from "@/lib/pricing-rules";
import { PoolsClient } from "./pools-client";

export default async function AdminCreditsPage() {
  const [
    authContext,
    creditApplied,
    creditGranted,
    recentJobs,
  ] = await Promise.all([
    requirePageRole(["admin"]),
    prisma.creditMovement.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { type: "CREDIT_APPLIED" },
    }),
    prisma.creditMovement.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { type: "CREDIT_GRANTED" },
    }),
    prisma.poolPriceFinalizationJob.findMany({
      take: 8,
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Ajustes de Crédito"
      description="Simula el cierre de viajes, define tarifas finales y audita la circulación de créditos y reembolsos."
    >
      <div className="flex flex-col gap-8">
        {/* Metric Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Saldos aplicados" value={String(creditApplied._count.id ?? 0)} description="Cantidad de descuentos realizados." tone="sky" />
          <MetricCard title="Total saldo aplicado" value={formatMoney(creditApplied._sum.amount?.toNumber() ?? 0, "ARS")} description="Dinero descontado antes de cobrar." tone="sky" />
          <MetricCard title="Créditos generados" value={String(creditGranted._count.id ?? 0)} description="Reembolsos o ajustes generados." tone="amber" />
          <MetricCard title="Total créditos devueltos" value={formatMoney(creditGranted._sum.amount?.toNumber() ?? 0, "ARS")} description="Fondos devueltos a favor del usuario." tone="amber" />
        </div>

        {/* Cierre T-1h Simulator tool */}
        <Suspense fallback={<EligiblePoolsSkeleton />}>
          <EligiblePoolsSection />
        </Suspense>

        {/* Split layouts: Job History & Credit Movements */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Historial de Cierre de Viajes */}
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Historial de cierres de viajes</h2>
                <p className="mt-2 text-sm text-slate-600">Últimos cálculos de tarifas finales.</p>
              </div>
              <TableReportButtons role="admin" section="pools" />
            </div>

            {recentJobs.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="Sin actividad reciente" description="Los viajes procesados aparecerán aquí." />
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {recentJobs.map((job) => (
                  <article key={job.id} className="rounded-xl border border-outline-custom bg-surface p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">Tarifa final de viaje</p>
                            <StatusBadge value={job.status} label={humanizeStatus(job.status)} />
                          </div>
                          <p className="mt-1.5 text-sm text-slate-700">
                            Monto final: <span className="font-bold text-slate-900">{job.finalPrice !== null ? formatMoney(job.finalPrice.toNumber(), job.currency) : "Pendiente"}</span>
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDateTime(job.startedAt)}</p>
                      </div>

                      {/* Formula visualization */}
                      {job.status === "COMPLETED" && job.finalPrice !== null && (
                        <div className="rounded-lg bg-slate-55 border border-slate-100 p-2 text-[10px] text-slate-600 leading-normal">
                          <span className="font-semibold block mb-0.5 text-slate-500">Cálculo de Tarifa Final:</span>
                          <span className="font-mono">
                            {formatMoney(job.basePrice.toNumber(), job.currency)} <span className="text-slate-400">(Base de Ocupantes)</span>
                            {" "}−{" "}
                            {formatMoney(job.discountValue ? job.discountValue.toNumber() : 0, job.currency)} <span className="text-slate-400">({job.discountType === "OCCUPANCY_DISCOUNT" ? "Ajuste de ocupación" : "Devolución"})</span>
                            {" "}={" "}
                            <span className="font-bold text-primary">{formatMoney(job.finalPrice.toNumber(), job.currency)}</span>
                          </span>
                        </div>
                      )}

                      <details className="text-xs text-slate-400">
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
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Historial de Movimientos de Saldo */}
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Movimientos de saldos</h2>
                <p className="mt-2 text-sm text-slate-600">Consumo o carga de saldo en el sistema.</p>
              </div>
              <TableReportButtons role="admin" section="credits" />
            </div>

            <Suspense fallback={<CreditsSkeleton />}>
              <CreditMovementsListSection />
            </Suspense>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Skeleton Loader Component displayed while pools are loading
 */
function EligiblePoolsSkeleton() {
  return (
    <section className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm animate-pulse">
      <div>
        <div className="h-4 w-28 bg-slate-200 rounded mb-2"></div>
        <div className="h-6 w-56 bg-slate-200 rounded mb-2"></div>
        <div className="h-4 w-96 bg-slate-100 rounded mb-6"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="h-3 w-32 bg-slate-100 rounded mb-2"></div>
            <div className="h-12 bg-slate-100 rounded-lg w-full"></div>
          </div>
          <div>
            <div className="h-3 w-40 bg-slate-100 rounded mb-2"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 bg-slate-100 rounded-lg"></div>
              <div className="h-11 bg-slate-100 rounded-lg"></div>
            </div>
          </div>
          <div className="h-12 bg-slate-200 rounded-lg w-full mt-4"></div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 flex flex-col justify-between h-[300px]">
          <div className="space-y-4">
            <div className="h-4 w-40 bg-slate-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-100 rounded"></div>
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-12 bg-slate-100 rounded"></div>
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
          <div className="h-16 bg-slate-100 rounded-xl w-full"></div>
        </div>
      </div>
    </section>
  );
}

/**
 * Isolated Async Component that performs passenger manifest fetches
 */
async function EligiblePoolsSection() {
  const dbPools = await prisma.charge.findMany({
    where: { status: "PAID" },
    select: { poolId: true },
    distinct: ["poolId"],
  });

  const mockPoolIds = getMockPoolIds();
  const allPoolIds = Array.from(new Set([...dbPools.map((c) => c.poolId), ...mockPoolIds]));

  const poolsData = await Promise.all(
    allPoolIds.map(async (poolId) => {
      const manifest = await getPoolPassengers(poolId);

      if (!manifest || manifest.passengers.length === 0) {
        return null;
      }

      const paidPassengers = manifest.passengers.filter((p) => p.paymentStatus === "PAID");

      if (paidPassengers.length === 0) {
        return null;
      }

      const firstPassenger = paidPassengers[0];
      const destinationId = firstPassenger.destinationId;
      const departureTime = firstPassenger.departureTime;
      const currency = firstPassenger.currency || "ARS";
      const maxPricePaid = Math.max(...paidPassengers.map((p) => p.maxPrice), 0);

      // Perform all database queries for this pool in parallel
      const [completedJob, poolCharges, pricingRule] = await Promise.all([
        prisma.poolPriceFinalizationJob.findFirst({
          where: { poolId, status: { in: ["STARTED", "COMPLETED"] } },
        }),
        prisma.charge.findMany({
          where: { poolId, status: "PAID" },
        }),
        destinationId
          ? findApplicablePricingRule(destinationId, paidPassengers.length)
          : Promise.resolve(null),
      ]);

      const hasChargesFinalized = poolCharges.length > 0 && poolCharges.every((c) => c.finalTripPrice !== null);
      const hasAdjustment = !!completedJob || hasChargesFinalized;

      return {
        poolId,
        destinationId,
        departureTime,
        currency,
        passengerCount: paidPassengers.length,
        maxPricePaid,
        pricingRule: pricingRule
          ? {
              id: pricingRule.id,
              basePrice: pricingRule.basePrice.toNumber(),
              discountType: pricingRule.discountType,
              discountValue: pricingRule.discountValue.toNumber(),
            }
          : null,
        hasJobCompleted: !!completedJob,
        hasChargesFinalized,
        hasAdjustment,
      };
    })
  );

  const eligiblePools = poolsData.filter((p): p is NonNullable<typeof p> => p !== null);

  return <PoolsClient pools={eligiblePools} />;
}

/**
 * Loading Placeholder for credit movements
 */
function CreditsSkeleton() {
  return (
    <div className="space-y-3 mt-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-outline-custom bg-surface p-4 h-24">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
            <div className="h-4 bg-slate-100 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function CreditMovementsListSection() {
  const recentMovements = await prisma.creditMovement.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { poolPriceFinalizationJob: true, charge: true },
  });

  if (recentMovements.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState title="Sin movimientos de crédito" description="Cuando se apliquen o generen créditos aparecerán aquí." />
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex justify-end">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {recentMovements.length} visibles
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {recentMovements.map((movement) => {
          const movementLabel =
            movement.type === "CREDIT_APPLIED"
              ? "Saldo utilizado en viaje"
              : movement.type === "CREDIT_GRANTED"
                ? "Saldo a favor acreditado (Ajuste o Devolución)"
                : movement.type;

          // Try to extract pricing variables to show equation
          const maxPaid = movement.charge ? movement.charge.maxPrice.toNumber() : null;
          const finalPrice = movement.charge ? (movement.charge.finalTripPrice ? movement.charge.finalTripPrice.toNumber() : null) : null;
          const refundAmount = movement.amount.toNumber();

          return (
            <article key={movement.id} className="rounded-xl border border-outline-custom bg-surface p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{movementLabel}</p>
                    <p className="mt-1 text-sm text-slate-700">Monto: <span className="font-semibold text-slate-900">{formatMoney(movement.amount.toNumber(), movement.currency)}</span></p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500">{formatDateTime(movement.createdAt)}</p>
                  </div>
                </div>

                {/* Equation for Granted Credits */}
                {movement.type === "CREDIT_GRANTED" && maxPaid !== null && finalPrice !== null && (
                  <div className="rounded-lg bg-slate-55 border border-slate-100 p-2 text-[10px] text-slate-650 leading-normal">
                    <span className="font-semibold block mb-0.5 text-slate-500">Cálculo del Reembolso:</span>
                    <span className="font-mono">
                      {formatMoney(maxPaid, movement.currency)} <span className="text-slate-400">(Cobrado máx)</span>
                      {" "}−{" "}
                      {formatMoney(finalPrice, movement.currency)} <span className="text-slate-400">(Tarifa final)</span>
                      {" "}={" "}
                      <span className="font-bold text-emerald-600">+{formatMoney(refundAmount, movement.currency)}</span>
                    </span>
                  </div>
                )}

                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                  <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                    <p>ID Movimiento: <span className="font-mono break-all">{movement.id}</span></p>
                    <p>ID Pasajero: <span className="font-mono break-all">{movement.userId}</span></p>
                    <p>ID Reserva: <span className="font-mono break-all">{movement.reservationId ?? "Sin reserva"}</span></p>
                    <p>ID Pool: <span className="font-mono break-all">{movement.poolId ?? "Sin pool"}</span></p>
                    <p>ID Cobro: <span className="font-mono break-all">{movement.chargeId ?? "No aplica"}</span></p>
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
