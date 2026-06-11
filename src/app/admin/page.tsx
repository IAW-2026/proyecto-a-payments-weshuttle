import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function StatCard({ title, value, description, color = "blue" }: { title: string; value: string; description?: string; color?: "blue" | "emerald" | "rose" | "amber" }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{title}</p>
      <h3 className="mt-2 text-3xl font-bold">{value}</h3>
      {description && <p className="mt-2 text-xs opacity-70">{description}</p>}
    </div>
  );
}

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
  const paidCharges = chargeStats.find(s => s.status === "PAID")?._count.id || 0;
  const successRate = totalCharges > 0 ? (paidCharges / totalCharges) * 100 : 0;

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Dashboard Financiero Global"
      description="Vista analitica de recaudacion, liquidaciones y salud operativa del sistema de pagos."
    >
      <div className="flex flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Admin Payments</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Dashboard Financiero</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 font-medium">
                Admin: {authContext.clerkUserId}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500"></span>
              <span className="text-sm font-semibold text-emerald-700">Sistema en linea</span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard 
              title="Total Recaudado" 
              value={`ARS ${totalCollected.toLocaleString()}`} 
              description="Dinero ingresado por Mercado Pago" 
              color="emerald" 
            />
            <StatCard 
              title="Credito Aplicado" 
              value={`ARS ${totalCreditApplied.toLocaleString()}`} 
              description="Saldo a favor usado en checkouts" 
              color="blue" 
            />
            <StatCard 
              title="Credito Generado" 
              value={`ARS ${totalCreditGranted.toLocaleString()}`} 
              description="Saldo a favor otorgado por ajustes" 
              color="amber" 
            />
            <StatCard 
              title="Total Liquidado" 
              value={`ARS ${totalSettled.toLocaleString()}`} 
              description="Fondos transferidos a conductores" 
              color="blue" 
            />
            <StatCard 
              title="Liquidaciones Pendientes" 
              value={pendingCount.toString()} 
              description={`Monto: ARS ${pendingAmount.toLocaleString()}`} 
              color="amber" 
            />
            <StatCard 
              title="Tasa de Exito" 
              value={`${successRate.toFixed(1)}%`} 
              description={`${paidCharges} de ${totalCharges} cobros exitosos`} 
              color={successRate > 90 ? "emerald" : successRate > 70 ? "amber" : "rose"} 
            />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Ultimos Cobros</h3>
              <Link href="/admin/transactions" className="text-xs font-bold text-blue-600 hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-4">
              {recentCharges.map(charge => (
                <div key={charge.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{charge.reservationId}</p>
                    <p className="text-xs text-slate-500">{charge.processedAt?.toLocaleDateString()} - {charge.status}</p>
                    <p className="text-xs text-slate-500">Credito aplicado: ARS {charge.creditApplied.toNumber().toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">ARS {charge.amountCharged.toNumber().toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Final: {charge.finalTripPrice !== null ? `ARS ${charge.finalTripPrice.toNumber().toFixed(2)}` : "Pendiente"}</p>
                  </div>
                </div>
              ))}
              {recentCharges.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Sin movimientos recientes.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Ultimos Procesos T-1h</h3>
            </div>
            <div className="space-y-4">
              {recentFinalizationJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">Pool: {job.poolId}</p>
                    <p className="text-xs text-slate-500">{job.startedAt.toLocaleDateString()} - {job.status}</p>
                    <p className="text-xs text-slate-500">Motivo: {job.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">Final: {job.finalPrice !== null ? `ARS ${job.finalPrice.toNumber().toFixed(2)}` : "N/D"}</p>
                    <p className="text-xs text-slate-500">Base: ARS {job.basePrice.toNumber().toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {recentFinalizationJobs.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Sin procesos recientes.</p>}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Ultimas Liquidaciones</h3>
            <Link href="/admin/settlements" className="text-xs font-bold text-blue-600 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-4">
            {recentSettlements.map(settlement => (
              <div key={settlement.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <div>
                  <p className="font-bold text-slate-900">Pool: {settlement.poolId}</p>
                  <p className="text-xs text-slate-500">{settlement.settledAt?.toLocaleDateString()} - {settlement.status}</p>
                </div>
                <p className="font-bold text-slate-900">ARS {settlement.amount.toNumber().toFixed(2)}</p>
              </div>
            ))}
            {recentSettlements.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Sin liquidaciones recientes.</p>}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/pricing-rules" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-900">
            <h4 className="font-bold text-slate-900">Configurar Precios</h4>
            <p className="mt-2 text-xs text-slate-600">ABM de reglas por destino y capacidad.</p>
          </Link>
          <Link href="/admin/transactions" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-900">
            <h4 className="font-bold text-slate-900">Auditar Transacciones</h4>
            <p className="mt-2 text-xs text-slate-600">Reporte detallado de cobros, credito aplicado y precio final.</p>
          </Link>
          <Link href="/admin/settlements" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-900">
            <h4 className="font-bold text-slate-900">Control de Liquidaciones</h4>
            <p className="mt-2 text-xs text-slate-600">Gestion de fondos transferidos a conductores.</p>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
