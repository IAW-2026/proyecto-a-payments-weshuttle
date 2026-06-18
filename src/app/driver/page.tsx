import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney } from "@/components/ui/format";
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
      title="Inicio"
      description="Bienvenido a tu panel de control de viajes y ganancias."
    >
      <div className="flex w-full flex-col gap-8">
        <DriverHero
          title="Controlá tus cobros y ganancias de forma simple"
          description="Aquí podés configurar tu cuenta para cobrar y ver un resumen de tus últimos cobros."
        />

        <DriverSummaryMetrics
          settledAmount={formatMoney(data.settledAmount, "ARS")}
          payoutAccountLabel={data.payoutAccount?.alias ?? data.payoutAccount?.accountReference ?? "Sin configurar"}
          payoutStatus={
            <StatusBadge value={data.payoutAccount?.status ?? "INACTIVE"} label={data.payoutAccount ? (data.payoutAccount.status === "ACTIVE" ? "Activa" : "Inactiva") : "Pendiente"} />
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
                <p className="mt-2 text-sm text-slate-600">La cuenta donde recibís el dinero de tus viajes.</p>
              </div>
              <Link href="/driver/account" className="text-sm font-semibold text-sky-700 hover:underline">
                Modificar cuenta
              </Link>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
              <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-900">Medio de cobro</dt>
                  <dd className="mt-1">{data.payoutAccount?.provider ?? "Sin configurar"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Estado de cuenta</dt>
                  <dd className="mt-1">{data.payoutAccount ? (data.payoutAccount.status === "ACTIVE" ? "Activa" : "Inactiva") : "Pendiente"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-900">CBU, CVU o ID de Mercado Pago</dt>
                  <dd className="mt-1 break-all">{data.payoutAccount?.accountReference ?? "Sin configurar"}</dd>
                </div>
              </dl>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Últimos cobros</h3>
                <p className="mt-2 text-sm text-slate-600">Últimos pagos enviados a tu cuenta.</p>
              </div>
              <Link href="/driver/trips?tab=cobros" className="text-sm font-semibold text-sky-700 hover:underline">
                Ver historial de cobros
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {data.recentSettlements.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no se registran cobros en tu cuenta.</p>
              ) : (
                data.recentSettlements.map((settlement) => (
                  <article key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Cobro por viaje</p>
                        <p className="mt-1 text-sm text-slate-600">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                      </div>
                      <StatusBadge value={settlement.status} label={settlement.status === "COMPLETED" ? "Pagado" : "Pendiente"} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {settlement.settledAt ? `Acreditado el ${formatDateTime(settlement.settledAt)}` : "Aún no se registró la fecha de pago"}
                    </p>
                    <details className="mt-3 text-xs text-slate-500 cursor-pointer hover:text-slate-800">
                      <summary className="font-medium select-none">Ver detalles técnicos</summary>
                      <div className="mt-2 space-y-1 pl-2 font-mono bg-slate-200/50 p-2 rounded-lg text-[10px]">
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
      </div>
    </AppShell>
  );
}
