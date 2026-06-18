import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData, paymentBanner, humanizeMovement } from "./rider-data";
import { RiderPaymentBanner } from "./rider-ui";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
    payment?: string;
    checkout_id?: string;
  }>;
};

export default async function RiderPage({ searchParams }: PageProps) {
  const [authContext, params] = await Promise.all([
    requirePageRole(["rider"]),
    searchParams,
  ]);
  const data = await getRiderPageData(authContext.clerkUserId);
  const latestPaymentBanner = paymentBanner(params.payment);
  
  // Encontrar el último pago si está pendiente de resolución
  const latestCheckout = data.recentCheckouts[0];
  const hasPendingPayment = latestCheckout && (latestCheckout.status === "CREATED" || latestCheckout.status === "PENDING");

  return (
    <AppShell
      role="rider"
      clerkUserId={authContext.clerkUserId}
      title="Mis Viajes y Pagos"
      description="Consulta tu saldo disponible y realiza tus pagos de manera segura."
    >
      <div className="flex flex-col gap-6">
        
        {/* Banner de estado del último pago (si viene de Mercado Pago) */}
        {latestPaymentBanner ? (
          <RiderPaymentBanner
            tone={latestPaymentBanner.tone}
            title={latestPaymentBanner.title}
            description={latestPaymentBanner.description}
            checkoutId={params.checkout_id}
          />
        ) : null}
        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        {/* 1. Acción Principal Destacada: Pago Pendiente */}
        {hasPendingPayment ? (
          <div className="relative overflow-hidden rounded-[24px] border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-6 shadow-md backdrop-blur flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 hover:shadow-lg">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-sky-500/5 blur-xl pointer-events-none" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                Pago Pendiente
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-900">
                Tienes un viaje por pagar
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Total a pagar: <strong className="text-slate-900 font-bold">{formatMoney(latestCheckout.amountToCharge.toNumber(), latestCheckout.currency)}</strong> (Código de viaje: #{latestCheckout.reservationId})
              </p>
            </div>
            <Link
              href={`/checkout/${latestCheckout.id}`}
              className="relative inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
            >
              Ir a Pagar
            </Link>
          </div>
        ) : null}

        {/* 2. Tarjeta de Saldo a Favor */}
        <SectionCard className="overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-sky-500/5 blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo a favor</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">
                {formatMoney(data.availableCredit, data.creditAccount?.currency ?? "ARS")}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Este monto se descontará automáticamente en tu próximo viaje.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/rider/balance"
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition"
              >
                Ver Historial de Saldo
              </Link>
              <Link
                href="/rider/checkout-demo"
                className="rounded-full bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-400 transition"
              >
                Simular Nuevo Viaje (Demo)
              </Link>
            </div>
          </div>
        </SectionCard>

        {/* 3. Listados de Pagos y Movimientos */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Historial de Pagos (Checkouts) */}
          <SectionCard>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mis Pagos Recientes</h3>
                <p className="text-xs text-slate-500">El estado de tus últimos viajes realizados.</p>
              </div>
              <Link href="/rider/checkouts" className="text-xs font-semibold text-sky-600 hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="space-y-2.5">
              {data.recentCheckouts.slice(0, 3).map((checkout) => (
                <Link
                  key={checkout.id}
                  href={`/checkout/${checkout.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-300/60 hover:bg-sky-50/10 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Viaje #{checkout.reservationId}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(checkout.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <p className="text-sm font-bold text-slate-800">
                      {formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}
                    </p>
                    <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                  </div>
                </Link>
              ))}

              {data.recentCheckouts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No tienes pagos registrados.</p>
              ) : null}
            </div>
          </SectionCard>

          {/* Historial de Saldo */}
          <SectionCard>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Historial de Saldo</h3>
                <p className="text-xs text-slate-500">Créditos aplicados o acumulados en tu cuenta.</p>
              </div>
              <Link href="/rider/balance" className="text-xs font-semibold text-sky-600 hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="space-y-2.5">
              {data.recentMovements.slice(0, 3).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{humanizeMovement(movement.type)}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(movement.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {formatMoney(movement.amount.toNumber(), movement.currency)}
                    </p>
                  </div>
                </div>
              ))}

              {data.recentMovements.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No registras movimientos de saldo.</p>
              ) : null}
            </div>
          </SectionCard>

        </div>

        {/* 4. Buscador y Consulta Rápida */}
        <SectionCard className="border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">¿Buscas un viaje en particular?</h4>
              <p className="text-xs text-slate-500">Consulta los detalles y el estado del pago ingresando su código.</p>
            </div>
            <Link
              href="/rider/reservations"
              className="inline-flex justify-center items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              Buscar por Código de Viaje
            </Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
