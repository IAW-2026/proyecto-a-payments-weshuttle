import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getDriverSummaryData } from "./driver-data";
import { DriverHero, DriverQuickActions, DriverSummaryMetrics } from "./driver-ui";

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
      title="Cobros y liquidaciones"
      description="Dashboard inicial del driver para entrar rapido a cuenta de cobro, viajes y liquidaciones."
    >
      <div className="flex w-full flex-col gap-8">
        <DriverHero
          title="Controla donde cobras y cuanto ya fue liquidado."
          description="Esta vista ahora funciona como puerta de entrada: resume tu cuenta activa, el estado operativo y los accesos mas utiles para la demo."
        />

        <DriverSummaryMetrics
          settledAmount={formatMoney(data.settledAmount, "ARS")}
          payoutAccountLabel={data.payoutAccount?.alias ?? data.payoutAccount?.accountReference ?? "Sin configurar"}
          payoutStatus={
            <StatusBadge value={data.payoutAccount?.status ?? "INACTIVE"} label={data.payoutAccount ? humanizeStatus(data.payoutAccount.status) : "Pendiente"} />
          }
          completedSettlements={data.completedSettlements}
          pendingSettlements={data.pendingSettlements}
        />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <DriverQuickActions />

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Cuenta activa</h3>
                <p className="mt-2 text-sm text-slate-600">Un resumen rapido de la cuenta donde hoy se liquidarian los viajes.</p>
              </div>
              <Link href="/driver/account" className="text-sm font-semibold text-sky-700 hover:underline">
                Gestionar cuenta
              </Link>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
              <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-900">Proveedor</dt>
                  <dd className="mt-1">{data.payoutAccount?.provider ?? "Sin configurar"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Estado</dt>
                  <dd className="mt-1">{data.payoutAccount ? humanizeStatus(data.payoutAccount.status) : "Pendiente"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-900">Referencia de cobro</dt>
                  <dd className="mt-1 break-all">{data.payoutAccount?.accountReference ?? "Sin configurar"}</dd>
                </div>
              </dl>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Liquidaciones recientes</h3>
                <p className="mt-2 text-sm text-slate-600">Resumen de los ultimos viajes liquidados o pendientes de transferencia.</p>
              </div>
              <Link href="/driver/settlements" className="text-sm font-semibold text-sky-700 hover:underline">
                Ver liquidaciones
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {data.recentSettlements.map((settlement) => (
                <article key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Pool {settlement.poolId}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                    </div>
                    <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Aun no se registro fecha de liquidacion"}</p>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
