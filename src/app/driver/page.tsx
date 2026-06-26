import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getDriverSummaryData } from "./driver-data";
import { DriverHero, DriverSummaryMetrics } from "./driver-ui";
import { simulateTripSettlementAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function DriverPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["driver"]);
  const params = await searchParams;
  const data = await getDriverSummaryData(authContext.clerkUserId);

  return (
    <AppShell
      role="driver"
      clerkUserId={authContext.clerkUserId}
      title=""
      description=""
    >
      <div className="flex w-full flex-col gap-8">
        <DriverHero
          title="Inicio"
          description="Bienvenido a tu panel de control de viajes y ganancias. Controlá tus cobros y ganancias de forma simple y configurá tu cuenta para cobrar."
        />

        <DriverSummaryMetrics
          settledAmount={formatMoney(data.settledAmount, "ARS")}
          payoutAccountLabel={data.payoutAccount?.alias ?? data.payoutAccount?.accountReference ?? "Sin configurar"}
          payoutStatus={
            <StatusBadge value={data.payoutAccount?.status ?? "INACTIVE"} label={data.payoutAccount ? (data.payoutAccount.status === "ACTIVE" ? "Activa" : "Inactiva") : "Pendiente"} rounded="lg" />
          }
          completedSettlements={data.completedSettlements}
          pendingSettlements={data.pendingSettlements}
        />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <SectionCard className="border-primary/10 bg-primary/5">
          <div>
            <h3 className="text-xl font-semibold text-primary">Simulador de viajes finalizados (Demo)</h3>
            <p className="mt-1 text-sm text-slate-gray">
              Simulá la finalización de un viaje para enviar una llamada a <code>POST /api/payments/pools/:pool_id/settle</code> y registrar una liquidación pendiente en el sistema.
            </p>
          </div>

          <form action={simulateTripSettlementAction} className="mt-5 grid gap-4 sm:grid-cols-3 items-end">
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="poolId" className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                ID del viaje (Pool)
              </label>
              <input
                id="poolId"
                name="poolId"
                type="text"
                placeholder="pool_sim_12345"
                className="w-full rounded-lg border border-outline-custom bg-white px-4 py-2.5 text-sm text-primary placeholder-slate-400 focus:border-primary focus:outline-hidden transition"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                Monto del viaje ($ ARS)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                defaultValue="15000"
                placeholder="15000"
                className="w-full rounded-lg border border-outline-custom bg-white px-4 py-2.5 text-sm text-primary placeholder-slate-400 focus:border-primary focus:outline-hidden transition"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white shadow-lg hover:bg-primary-hover transition cursor-pointer"
            >
              Simular viaje finalizado
            </button>
          </form>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-primary">Últimos cobros</h3>
              <p className="mt-2 text-sm text-slate-gray">Últimos pagos enviados a tu cuenta.</p>
            </div>
            <Link href="/driver/trips" className="text-sm font-semibold text-primary hover:underline">
              Ver historial de cobros
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {data.recentSettlements.length === 0 ? (
              <p className="text-sm text-slate-gray">Aún no se registran cobros en tu cuenta.</p>
            ) : (
              data.recentSettlements.map((settlement) => (
                <article key={settlement.id} className="rounded-xl border border-outline-custom bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary">Cobro por viaje</p>
                      <p className="mt-1 text-sm text-slate-gray">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                    </div>
                    <StatusBadge value={settlement.status} label={settlement.status === "COMPLETED" ? "Pagado" : "Pendiente"} rounded="lg" />
                  </div>
                  <p className="mt-3 text-xs text-slate-gray">
                    {settlement.settledAt ? `Acreditado el ${formatDateTime(settlement.settledAt)}` : "Aún no se registró la fecha de pago"}
                  </p>
                  <details className="mt-3 text-xs text-slate-gray cursor-pointer hover:text-primary">
                    <summary className="font-medium select-none">Ver detalles técnicos</summary>
                    <div className="mt-2 space-y-1 pl-2 font-mono bg-primary/5 p-2.5 rounded-lg text-[10px] border border-primary/10">
                      <p>ID de pago: {settlement.id}</p>
                      <p>ID de viaje (Pool): {settlement.poolId}</p>
                    </div>
                  </details>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
