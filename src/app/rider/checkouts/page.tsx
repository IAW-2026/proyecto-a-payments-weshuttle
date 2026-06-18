import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData } from "../rider-data";
import { RiderHero } from "../rider-ui";

export default async function RiderCheckoutsPage() {
  const authContext = await requirePageRole(["rider"]);
  const data = await getRiderPageData(authContext.clerkUserId);

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Checkouts recientes" description="Retoma pagos creados y muestra con claridad el estado actual de cada reserva.">
      <div className="flex flex-col gap-8">
        <RiderHero title="Retoma checkouts sin ruido visual." description="Cada tarjeta te lleva directo al resumen de checkout para continuar con la demo o revisar su estado." />

        <SectionCard>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Historial visible</h3>
            <p className="mt-2 text-sm text-slate-600">Checkouts creados por tu usuario, ordenados del mas reciente al mas antiguo.</p>
          </div>

          <div className="mt-6 space-y-3">
            {data.recentCheckouts.map((checkout) => (
              <Link key={checkout.id} href={`/checkout/${checkout.id}`} className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-sky-300 hover:bg-sky-50/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Reserva {checkout.reservationId}</p>
                    <p className="mt-1 text-xs text-slate-500">Pool {checkout.poolId}</p>
                    <p className="mt-2 text-sm text-slate-600">Total pendiente: {formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                    <span className="text-xs font-medium text-slate-500">Abrir checkout</span>
                  </div>
                </div>
              </Link>
            ))}

            {data.recentCheckouts.length === 0 ? (
              <EmptyState title="Todavia no hay checkouts" description="Crea un checkout de demo para empezar a mostrar el flujo de pago en la presentacion." />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
