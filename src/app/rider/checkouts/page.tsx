import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData } from "../rider-data";
import { RiderHero } from "../rider-ui";

export default async function RiderCheckoutsPage() {
  const authContext = await requirePageRole(["rider"]);
  const data = await getRiderPageData(authContext.clerkUserId);

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="Mis Pagos Recientes" description="Historial de tus pagos y estado de tus viajes.">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <RiderHero title="Consulta tu historial de pagos." description="Aquí puedes revisar el estado y el desglose de todos los viajes asociados a tu cuenta." />

        <SectionCard>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Historial de pagos</h3>
            <p className="text-xs text-slate-500">Listado ordenado desde el viaje más reciente.</p>
          </div>

          <div className="mt-6 space-y-3">
            {data.recentCheckouts.map((checkout) => (
              <Link key={checkout.id} href={`/checkout/${checkout.id}`} className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-sky-300 hover:bg-sky-50/20 transition-all duration-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 shrink-0">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h5" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Viaje #{checkout.reservationId}</p>
                      <p className="text-xs text-slate-400">Creado el {formatDateTime(checkout.createdAt)}</p>
                      <p className="mt-1 text-sm text-slate-600">Total a pagar: <strong className="text-slate-900 font-bold">{formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}</strong></p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                    <span className="text-xs font-semibold text-sky-600">Ver recibo</span>
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
