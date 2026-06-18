import { AppShell } from "@/components/app-shell";
import { AdminHero } from "../admin-ui";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Pools"
      description="Vista operativa por pool para explicar finalizacion de precio, descuentos aplicados y estado de cierre dentro de la demo."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Relaciona pricing y operacion por pool." description="Esta vista muestra como impactan las reglas de precios sobre el cierre operativo sin tocar ninguna regla funcional." />

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Jobs visibles" value={String(recentJobs.length)} description="Procesos recientes de finalizacion por pool." tone="sky" />
          <MetricCard title="Completados" value={String(completedJobs)} description="Pools con finalizacion resuelta." tone="emerald" />
          <MetricCard title="En ejecucion" value={String(pendingJobs)} description="Pools todavia en revision o ejecucion." tone="amber" />
        </div>

        <SectionCard>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Actividad reciente por pool</h2>
            <p className="mt-2 text-sm text-slate-600">Ideal para mostrar como impactan las reglas de precios sobre el cierre del pool.</p>
          </div>

          {recentJobs.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="Sin actividad reciente" description="Cuando se ejecuten cierres de precio por pool apareceran aqui." />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentJobs.map((job) => (
                <article key={job.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">Pool {job.poolId}</p>
                        <StatusBadge value={job.status} label={humanizeStatus(job.status)} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Motivo: {job.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">Pasajeros: {job.currentPassengers}</p>
                      <p className="mt-1 text-xs text-slate-500">Descuento: {job.discountType ?? "No aplica"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-slate-900">Base {formatMoney(job.basePrice.toNumber(), job.currency)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Final {job.finalPrice !== null ? formatMoney(job.finalPrice.toNumber(), job.currency) : "Pendiente"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Inicio {formatDateTime(job.startedAt)}</p>
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
