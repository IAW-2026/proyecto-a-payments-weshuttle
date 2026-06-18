import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getDriverTripsData } from "../driver-data";
import { DriverHero } from "../driver-ui";

export default async function DriverTripsPage() {
  const authContext = await requirePageRole(["driver"]);
  const trips = await getDriverTripsData(authContext.clerkUserId);

  return (
    <AppShell role="driver" clerkUserId={authContext.clerkUserId} title="Pools y viajes" description="Vista operativa del viaje basada en los pools y liquidaciones que hoy registra Payments App.">
      <div className="flex flex-col gap-8">
        <DriverHero title="Muestra el estado operativo de cada pool." description="Como Payments App hoy no expone una entidad de viaje completa en esta vista, el resumen se apoya en pools y liquidaciones reales ya persistidas." />

        <SectionCard>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Actividad visible por pool</h3>
            <p className="mt-2 text-sm text-slate-600">Cada bloque resume un pool, su estado de liquidacion y la referencia de cobro disponible.</p>
          </div>

          {trips.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="Sin pools visibles" description="Cuando existan liquidaciones para este conductor apareceran aqui como viajes visibles para la demo." />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {trips.map((trip) => (
                <article key={trip.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">Pool {trip.poolId}</p>
                        <StatusBadge value={trip.status} label={humanizeStatus(trip.status)} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Liquidacion esperada para este viaje: {formatMoney(trip.amount.toNumber(), trip.currency)}</p>
                      <p className="mt-1 text-xs text-slate-500">Cuenta asociada: {trip.payoutReference ?? "Sin cuenta asociada"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-slate-900">{trip.settledAt ? "Liquidado" : "Pendiente"}</p>
                      <p className="mt-1 text-xs text-slate-500">{trip.settledAt ? formatDateTime(trip.settledAt) : "Aun no se registro fecha de liquidacion"}</p>
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
