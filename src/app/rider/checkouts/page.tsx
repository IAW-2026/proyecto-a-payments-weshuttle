import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData } from "../rider-data";
import { RiderHero } from "../rider-ui";
import { TableReportButtons } from "@/components/table-report-buttons";

export default async function RiderCheckoutsPage() {
  const authContext = await requirePageRole(["rider"]);

  return (
    <AppShell role="rider" clerkUserId={authContext.clerkUserId} title="" description="">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <RiderHero 
          title="Mis Pagos Recientes" 
          description="Historial de tus pagos y estado de tus viajes. Aquí puedes revisar el estado y el desglose de todos los viajes asociados a tu cuenta." 
        />

        <Suspense fallback={<RiderCheckoutsSkeleton />}>
          <RiderCheckoutsContentSection clerkUserId={authContext.clerkUserId} />
        </Suspense>
      </div>
    </AppShell>
  );
}

function RiderCheckoutsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 h-[400px] animate-pulse">
      <div className="h-5 w-44 bg-slate-200 rounded mb-2"></div>
      <div className="h-3 w-64 bg-slate-100 rounded mb-6"></div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl"></div>
        ))}
      </div>
    </div>
  );
}

async function RiderCheckoutsContentSection({ clerkUserId }: { clerkUserId: string }) {
  const data = await getRiderPageData(clerkUserId);

  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Historial de pagos</h3>
          <p className="text-xs text-slate-500">Listado ordenado desde el viaje más reciente.</p>
        </div>
        <TableReportButtons role="rider" section="payments" />
      </div>

      <div className="mt-6 space-y-3">
        {data.recentCheckouts.map((checkout) => {
          const creditRefund = checkout.charges?.reduce((acc, c) => acc + c.creditGranted.toNumber(), 0) || 0;
          const isPaid = checkout.status === "PAID";
          const isPending = checkout.status === "CREATED" || checkout.status === "PENDING";
          const isClickable = isPaid || isPending;

          const cardContent = (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h5" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800">
                    {checkout.destinationName ? `Destino: ${checkout.destinationName}` : `Viaje #${checkout.reservationId}`}
                  </p>
                  {checkout.departureTime ? (
                    <p className="text-xs text-slate-500">
                      Horario de salida: <span className="font-semibold text-slate-700">{formatDateTime(checkout.departureTime)}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Creado el {formatDateTime(checkout.createdAt)}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    {isPaid ? "Total: " : "Total a pagar: "}
                    <strong className="text-slate-900 font-bold">{formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}</strong>
                  </p>
                  {isPaid && (
                    <p className="mt-1 text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Saldo devuelto: +{formatMoney(creditRefund, checkout.currency)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                {isPaid && (
                  <span className="text-xs font-semibold text-sky-600">Ver recibo</span>
                )}
                {isPending && (
                  <span className="text-xs font-semibold text-amber-600">Pagar viaje →</span>
                )}
              </div>
            </div>
          );

          if (isClickable) {
            return (
              <Link
                key={checkout.id}
                href={`/checkout/${checkout.id}`}
                className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-sky-300 hover:bg-sky-50/20 transition-all duration-200"
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div
              key={checkout.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 opacity-70"
            >
              {cardContent}
            </div>
          );
        })}

        {data.recentCheckouts.length === 0 ? (
          <EmptyState title="Todavia no hay checkouts" description="Crea un checkout de demo para empezar a mostrar el flujo de pago en la presentacion." />
        ) : null}
      </div>
    </SectionCard>
  );
}

