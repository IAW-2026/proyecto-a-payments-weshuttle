import { AppShell } from "@/components/app-shell";
import { AdminHero } from "../admin-ui";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminCreditsPage() {
  const [authContext, creditApplied, creditGranted, recentMovements] = await Promise.all([
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
    prisma.creditMovement.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Creditos"
      description="Vista operativa para explicar como se aplican y generan creditos dentro del flujo de Payments App."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Explica como circula el credito dentro del sistema." description="Separa claramente el saldo aplicado en pagos del credito generado por ajustes o cierre de pool." />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Aplicados" value={String(creditApplied._count.id ?? 0)} description="Movimientos usados por riders en pagos." tone="sky" />
          <MetricCard title="Monto aplicado" value={formatMoney(creditApplied._sum.amount?.toNumber() ?? 0, "ARS")} description="Saldo consumido antes de cobrar." tone="sky" />
          <MetricCard title="Generados" value={String(creditGranted._count.id ?? 0)} description="Movimientos creados por ajustes o cierre de pool." tone="amber" />
          <MetricCard title="Monto generado" value={formatMoney(creditGranted._sum.amount?.toNumber() ?? 0, "ARS")} description="Credito devuelto al usuario." tone="amber" />
        </div>

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Movimientos recientes</h2>
              <p className="mt-2 text-sm text-slate-600">Relaciona credito, reserva, pool y cargo asociado sin cambiar la logica del sistema.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {recentMovements.length} visibles
            </span>
          </div>

          {recentMovements.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="Sin movimientos de credito" description="Cuando se apliquen o generen creditos apareceran aqui." />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentMovements.map((movement) => (
                <article key={movement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{movement.type}</p>
                      <p className="mt-1 text-xs text-slate-500">Usuario {movement.userId}</p>
                      <p className="mt-1 text-xs text-slate-500">Reserva {movement.reservationId ?? "Sin reserva"}</p>
                      <p className="mt-1 text-xs text-slate-500">Pool {movement.poolId ?? "Sin pool"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-slate-900">{formatMoney(movement.amount.toNumber(), movement.currency)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(movement.createdAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Cargo {movement.chargeId ?? "No aplica"}</p>
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
