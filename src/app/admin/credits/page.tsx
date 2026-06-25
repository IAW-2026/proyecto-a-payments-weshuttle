import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminHero } from "../admin-ui";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TableReportButtons } from "@/components/table-report-buttons";

export default async function AdminCreditsPage() {
  const [authContext, creditApplied, creditGranted] = await Promise.all([
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
  ]);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Saldos y créditos"
      description="Seguimiento y auditoría de la circulación de saldos a favor aplicados y reembolsos de los pasajeros."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Circulación de saldo y crédito" description="Monitorea cómo se consume el saldo a favor de los usuarios en los cobros de viajes y cómo se generan nuevos créditos por ajustes o devoluciones." />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Saldos aplicados" value={String(creditApplied._count.id ?? 0)} description="Cantidad de descuentos realizados." tone="sky" />
          <MetricCard title="Total saldo aplicado" value={formatMoney(creditApplied._sum.amount?.toNumber() ?? 0, "ARS")} description="Dinero descontado antes de cobrar." tone="sky" />
          <MetricCard title="Créditos generados" value={String(creditGranted._count.id ?? 0)} description="Reembolsos o ajustes generados." tone="amber" />
          <MetricCard title="Total créditos devueltos" value={formatMoney(creditGranted._sum.amount?.toNumber() ?? 0, "ARS")} description="Fondos devueltos a favor del usuario." tone="amber" />
        </div>

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Movimientos recientes de saldo</h2>
              <p className="mt-2 text-sm text-slate-600">Últimos movimientos de consumo o carga de saldo en el sistema.</p>
            </div>
            <div className="flex items-center gap-3">
              <TableReportButtons role="admin" section="credits" />
            </div>
          </div>

          <Suspense fallback={<CreditsSkeleton />}>
            <CreditMovementsListSection />
          </Suspense>
        </SectionCard>
      </div>
    </AppShell>
  );
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
    take: 12,
    orderBy: { createdAt: "desc" },
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

          return (
            <article key={movement.id} className="rounded-xl border border-outline-custom bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{movementLabel}</p>
                  <p className="mt-1.5 text-sm text-slate-600">Monto: <span className="font-semibold text-slate-900">{formatMoney(movement.amount.toNumber(), movement.currency)}</span></p>
                  <details className="mt-2.5 text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                    <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                      <p>ID Movimiento: <span className="font-mono">{movement.id}</span></p>
                      <p>ID Pasajero: <span className="font-mono">{movement.userId}</span></p>
                      <p>ID Reserva: <span className="font-mono">{movement.reservationId ?? "Sin reserva"}</span></p>
                      <p>ID Pool: <span className="font-mono">{movement.poolId ?? "Sin pool"}</span></p>
                      <p>ID Cobro: <span className="font-mono">{movement.chargeId ?? "No aplica"}</span></p>
                      <p>Código del tipo: <span className="font-mono">{movement.type}</span></p>
                    </div>
                  </details>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500">{formatDateTime(movement.createdAt)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
