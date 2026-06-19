import { AppShell } from "@/components/app-shell";
import { AdminHero } from "../admin-ui";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMockPoolIds, getPoolPassengers } from "@/lib/external-apis";
import { findApplicablePricingRule } from "@/lib/pricing-rules";
import { PoolsClient } from "./pools-client";
import { TableReportButtons } from "@/components/table-report-buttons";

export default async function AdminPoolsPage() {
  const [authContext, recentJobs, completedJobs, pendingJobs] = await Promise.all([
    requirePageRole(["admin"]),
    prisma.poolPriceFinalizationJob.findMany({
      take: 12,
      orderBy: { startedAt: "desc" },
    }),
    prisma.poolPriceFinalizationJob.count({ where: { status: "COMPLETED" } }),
    prisma.poolPriceFinalizationJob.count({ where: { status: "STARTED" } }),
  ]);

  const dbPools = await prisma.charge.findMany({
    where: { status: "PAID" },
    select: { poolId: true },
    distinct: ["poolId"],
  });

  const mockPoolIds = getMockPoolIds();
  const allPoolIds = Array.from(new Set([...dbPools.map((c) => c.poolId), ...mockPoolIds]));

  const eligiblePools = [];

  for (const poolId of allPoolIds) {
    const manifest = await getPoolPassengers(poolId);

    if (manifest && manifest.passengers.length > 0) {
      const paidPassengers = manifest.passengers.filter((p) => p.paymentStatus === "PAID");

      if (paidPassengers.length > 0) {
        const firstPassenger = paidPassengers[0];
        const destinationId = firstPassenger.destinationId;
        const departureTime = firstPassenger.departureTime;
        const currency = firstPassenger.currency || "ARS";
        const maxPricePaid = Math.max(...paidPassengers.map((p) => p.maxPrice), 0);

        const completedJob = await prisma.poolPriceFinalizationJob.findFirst({
          where: { poolId, status: { in: ["STARTED", "COMPLETED"] } },
        });

        const poolCharges = await prisma.charge.findMany({
          where: { poolId, status: "PAID" },
        });
        const hasChargesFinalized = poolCharges.length > 0 && poolCharges.every((c) => c.finalTripPrice !== null);

        const hasAdjustment = !!completedJob || hasChargesFinalized;

        const pricingRule = destinationId
          ? await findApplicablePricingRule(destinationId, paidPassengers.length)
          : null;

        eligiblePools.push({
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
        });
      }
    }
  }

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Cierre de viajes"
      description="Calcula y audita las tarifas finales de los viajes compartidos al completarse."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Liquidación final de tarifas de viaje" description="Esta vista detalla cómo el sistema calcula y define el costo definitivo de un viaje una vez finalizado, según la cantidad de pasajeros y las reglas de precios vigentes." />

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Procesos registrados" value={String(recentJobs.length)} description="Cálculos de tarifa realizados recientemente." tone="sky" />
          <MetricCard title="Viajes finalizados" value={String(completedJobs)} description="Tarifas calculadas y liquidadas con éxito." tone="emerald" />
          <MetricCard title="Viajes en proceso" value={String(pendingJobs)} description="Cálculos en ejecución o revisión pendiente." tone="amber" />
        </div>

        <PoolsClient pools={eligiblePools} />

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Actividad de cierre de viajes</h2>
              <p className="mt-2 text-sm text-slate-600">Revisa cómo impactaron las tarifas y descuentos sobre la facturación de cada viaje grupal.</p>
            </div>
            <TableReportButtons role="admin" section="pools" />
          </div>

          {recentJobs.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="Sin actividad reciente" description="Cuando se completen viajes y se procesen sus tarifas aparecerán aquí." />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentJobs.map((job) => (
                <article key={job.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">Tarifa final de viaje</p>
                        <StatusBadge value={job.status} label={humanizeStatus(job.status)} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Tarifa final calculada: <span className="font-bold text-slate-900">{job.finalPrice !== null ? formatMoney(job.finalPrice.toNumber(), job.currency) : "Pendiente"}</span></p>
                      
                      <details className="mt-3 text-xs text-slate-400">
                        <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                        <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                          <p>ID Pool (Viaje): <span className="font-mono">{job.poolId}</span></p>
                          <p>ID Proceso (Job): <span className="font-mono">{job.id}</span></p>
                          <p>Motivo: {job.reason}</p>
                          <p>Pasajeros viajando: {job.currentPassengers}</p>
                          <p>Precio base de la ruta: {formatMoney(job.basePrice.toNumber(), job.currency)}</p>
                          <p>Descuento aplicado: {job.discountType ?? "No aplica"}</p>
                          <p>Iniciado: {formatDateTime(job.startedAt)}</p>
                        </div>
                      </details>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">{formatDateTime(job.startedAt)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
