import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData, humanizeMovement } from "../rider-data";
import { RiderHero } from "../rider-ui";
import { TableReportButtons } from "@/components/table-report-buttons";

export default async function RiderBalancePage() {
  const authContext = await requirePageRole(["rider"]);
  const data = await getRiderPageData(authContext.clerkUserId);

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Saldo y movimientos" description="Consulta tu credito disponible y los ultimos movimientos vinculados al flujo de pago.">
      <div className="flex flex-col gap-8">
        <RiderHero title="Entiende cuanto credito tienes disponible." description="Esta seccion concentra el saldo a favor y los movimientos mas relevantes sin mezclarlo con otras herramientas del rider." />

        <SectionCard>
          <div className="rounded-xl border border-primary/10 bg-linear-to-br from-primary/5 to-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Saldo a favor</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{formatMoney(data.availableCredit, data.creditAccount?.currency ?? "ARS")}</p>
            <p className="mt-2 text-sm text-slate-600">Se aplica antes de cobrar por Mercado Pago.</p>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Movimientos recientes</h3>
              <p className="mt-2 text-sm text-slate-600">Ideal para explicar de donde viene el saldo disponible y como impacta en la reserva.</p>
            </div>
            <TableReportButtons role="rider" section="balance" />
          </div>

          <div className="mt-6 space-y-3">
            {data.recentMovements.map((movement) => (
              <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{humanizeMovement(movement.type)}</p>
                    <p className="mt-1 text-xs text-slate-500">{movement.description ?? "Movimiento registrado en tu cuenta de credito."}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-slate-900">{formatMoney(movement.amount.toNumber(), movement.currency)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(movement.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}

            {data.recentMovements.length === 0 ? (
              <EmptyState title="Aun no hay movimientos" description="Cuando se aplique o genere credito en una reserva, lo veras reflejado aqui." />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
