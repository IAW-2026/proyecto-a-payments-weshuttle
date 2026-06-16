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
  const authContext = await requirePageRole(["admin"]);

  const [
    totalCollectedData,
    totalCreditAppliedData,
    totalCreditGrantedData,
    totalSettledData,
    pendingSettlementsData,
    chargeStats,
    recentCharges,
    recentFinalizationJobs,
    recentSettlements,
  ] = await Promise.all([
    prisma.charge.aggregate({
      _sum: { amountCharged: true },
      where: { status: "PAID" },
    }),
    prisma.creditMovement.aggregate({
      _sum: { amount: true },
      where: { type: "CREDIT_APPLIED" },
    }),
    prisma.creditMovement.aggregate({
      _sum: { amount: true },
      where: { type: "CREDIT_GRANTED" },
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
    prisma.charge.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.charge.findMany({
      take: 5,
      orderBy: { processedAt: "desc" },
    }),
    prisma.poolPriceFinalizationJob.findMany({
      take: 5,
      orderBy: { startedAt: "desc" },
    }),
    prisma.settlement.findMany({
      take: 5,
      orderBy: { settledAt: "desc" },
    }),
  ]);

  const totalCollected = totalCollectedData._sum.amountCharged?.toNumber() || 0;
  const totalCreditApplied = totalCreditAppliedData._sum.amount?.toNumber() || 0;
  const totalCreditGranted = totalCreditGrantedData._sum.amount?.toNumber() || 0;
  const totalSettled = totalSettledData._sum.amount?.toNumber() || 0;
  const pendingAmount = pendingSettlementsData._sum.amount?.toNumber() || 0;
  const pendingCount = pendingSettlementsData._count.id || 0;

  const totalCharges = chargeStats.reduce((acc, curr) => acc + curr._count.id, 0);
  const paidCharges = chargeStats.find((s) => s.status === "PAID")?._count.id || 0;
  const successRate = totalCharges > 0 ? (paidCharges / totalCharges) * 100 : 0;

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Control financiero"
      description="Vista ejecutiva para entender recaudacion, creditos, liquidaciones y salud operativa del sistema durante la demo."
    >
      <div className="flex flex-col gap-8">
        <SectionCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Admin Demo</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Panorama rapido del negocio de pagos.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Esta pantalla resume cuanto se cobro, cuanto se liquido y que areas requieren atencion inmediata antes de entrar al detalle operativo.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"></span>
                Sistema en linea
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard title="Total recaudado" value={formatMoney(totalCollected, "ARS")} description="Cobros acreditados por el flujo de pagos." tone="emerald" />
              <MetricCard title="Credito aplicado" value={formatMoney(totalCreditApplied, "ARS")} description="Saldo a favor usado por riders en checkouts." tone="sky" />
              <MetricCard title="Credito generado" value={formatMoney(totalCreditGranted, "ARS")} description="Ajustes y devoluciones convertidos en saldo." tone="amber" />
              <MetricCard title="Total liquidado" value={formatMoney(totalSettled, "ARS")} description="Fondos ya derivados a conductores." tone="sky" />
              <MetricCard title="Liquidaciones pendientes" value={String(pendingCount)} description={`Monto pendiente: ${formatMoney(pendingAmount, "ARS")}`} tone="amber" />
              <MetricCard title="Tasa de exito" value={`${successRate.toFixed(1)}%`} description={`${paidCharges} de ${totalCharges} cobros terminaron en pagado.`} tone={successRate > 90 ? "emerald" : successRate > 70 ? "amber" : "rose"} />
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-8 lg:grid-cols-2">
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Ultimos cobros</h3>
                <p className="mt-2 text-sm text-slate-600">Reservas cobradas recientemente con foco en monto y credito aplicado.</p>
              </div>
              <Link href="/admin/transactions" className="text-sm font-semibold text-sky-700 hover:underline">
                Ver transacciones
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {recentCharges.map((charge) => (
                <div key={charge.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Reserva {charge.reservationId}</p>
                      <p className="mt-1 text-xs text-slate-500">Pool {charge.poolId}</p>
                      <p className="mt-2 text-sm text-slate-600">Credito aplicado: {formatMoney(charge.creditApplied.toNumber(), charge.currency)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <StatusBadge value={charge.status} label={humanizeStatus(charge.status)} />
                      <p className="text-sm font-semibold text-slate-900">{formatMoney(charge.amountCharged.toNumber(), charge.currency)}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(charge.processedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {recentCharges.length === 0 ? (
                <EmptyState title="Sin cobros recientes" description="Cuando ingresen pagos nuevos apareceran aqui para una lectura ejecutiva rapida." />
              ) : null}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Procesos T-1h</h3>
                <p className="mt-2 text-sm text-slate-600">Revision operativa de finalizacion de precio por pool.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recentFinalizationJobs.map((job) => (
                <div key={job.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Pool {job.poolId}</p>
                      <p className="mt-1 text-xs text-slate-500">{job.reason}</p>
                      <p className="mt-2 text-sm text-slate-600">Base: {formatMoney(job.basePrice.toNumber(), "ARS")}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <StatusBadge value={job.status} />
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        Final: {job.finalPrice !== null ? formatMoney(job.finalPrice.toNumber(), "ARS") : "No disponible"}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(job.startedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {recentFinalizationJobs.length === 0 ? (
                <EmptyState title="Sin procesos recientes" description="Cuando se ejecute una finalizacion T-1h se mostrara aqui su resultado." />
              ) : null}
            </div>
          </SectionCard>
        </div>

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Ultimas liquidaciones</h3>
              <p className="mt-2 text-sm text-slate-600">Transferencias recientes hacia conductores.</p>
            </div>
            <Link href="/admin/settlements" className="text-sm font-semibold text-sky-700 hover:underline">
              Ver liquidaciones
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentSettlements.map((settlement) => (
              <div key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Pool {settlement.poolId}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(settlement.settledAt)}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                  </div>
                </div>
              </div>
            ))}
            {recentSettlements.length === 0 ? (
              <EmptyState title="Sin liquidaciones recientes" description="Las proximas liquidaciones completadas se resumiran en este bloque." />
            ) : null}
          </div>
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/pricing-rules" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
            <h4 className="font-semibold text-slate-900">Configurar precios</h4>
            <p className="mt-2 text-sm text-slate-600">Gestiona reglas de pricing para cotizaciones, topes y descuentos.</p>
          </Link>
          <Link href="/admin/transactions" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
            <h4 className="font-semibold text-slate-900">Auditar transacciones</h4>
            <p className="mt-2 text-sm text-slate-600">Explora cobros, creditos aplicados y resultado de cada reserva.</p>
          </Link>
          <Link href="/admin/settlements" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
            <h4 className="font-semibold text-slate-900">Controlar liquidaciones</h4>
            <p className="mt-2 text-sm text-slate-600">Sigue el estado de las transferencias hacia conductores.</p>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
